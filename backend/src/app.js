require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.isProduction ? process.env.FRONTEND_URL : 'http://localhost:5173',
  credentials: true,
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes — we add these as we build each module
try { app.use('/api/auth', require('./routes/auth.routes')); } catch(e) { logger.warn('auth routes not ready'); }
try { app.use('/api/monitors', require('./routes/monitor.routes')); } catch(e) { logger.warn('monitor routes not ready'); }
try { app.use('/api/incidents', require('./routes/incident.routes')); } catch(e) { logger.warn('incident routes not ready'); }
try { app.use('/api/stats', require('./routes/stats.routes')); } catch(e) { logger.warn('stats routes not ready'); }

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: config.isProduction ? 'Internal server error' : err.message,
  });
});

module.exports = app;
