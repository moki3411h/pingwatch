const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const config = require('../config');
const logger = require('../utils/logger');

const BCRYPT_ROUNDS = 12;

const register = async (req, res, next) => {
  const { name, email, password } = req.body;
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, passwordHash]
    );
    const user = result.rows[0];

    const token = jwt.sign({ sub: user.id, email: user.email }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    logger.info('User registered', { userId: user.id });

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email]
    );

    // TIMING ATTACK PREVENTION: always run bcrypt.compare even when user not found
    const user = result.rows[0];
    const fakeHash = '$2b$12$invalidhashfortimingattackprevention000000000000000000';
    const isValid = await bcrypt.compare(password, user ? user.password_hash : fakeHash);

    if (!user || !isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    logger.info('User logged in', { userId: user.id });

    return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
