require('dotenv').config();
const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const pool = require('./src/db/pool');
const { startScheduler } = require('./src/services/scheduler.service');

async function main() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection verified');
  } catch (err) {
    logger.error('Failed to connect to database', { err: err.message });
    process.exit(1);
  }

  startScheduler();
  logger.info('Scheduler started');

  const server = app.listen(config.port, () => {
    logger.info(`PingWatch API running on port ${config.port}`, {
      env: config.nodeEnv,
    });
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      pool.end();
      process.exit(0);
    });
  });
}

main();
