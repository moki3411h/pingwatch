process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');

// Generate a unique email for each test run so repeated runs don't fail
const uniqueEmail = () => `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

let testEmail;

beforeAll(() => {
  testEmail = uniqueEmail();
});

afterAll(async () => {
  // Clean up test users created during this run
  await pool.query('DELETE FROM users WHERE email LIKE $1', ['test_%@example.com']);
  await pool.end();
});

describe('POST /api/auth/register', () => {
  it('returns 201 and a token with valid data', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: testEmail, password: 'Test@1234' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testEmail);
  });

  it('returns 409 when email is already registered', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: testEmail, password: 'Test@1234' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('returns 400 when password is too weak', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: uniqueEmail(), password: 'weak' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('details');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: uniqueEmail(), password: 'Test@1234' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 and a token with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'Test@1234' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPassword1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('returns 401 with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Test@1234' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'Test@1234' });
    token = res.body.token;
  });

  it('returns 200 with user data when token is valid', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.real.token');

    expect(res.status).toBe(401);
  });
});
