const winston = require('winston');
const config = require('../config');

const logger = winston.createLogger({
  level: config.isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    config.isProduction
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...rest }) => {
            const meta = Object.keys(rest).length ? JSON.stringify(rest) : '';
            return `${timestamp} [${level}]: ${message} ${meta}`;
          })
        )
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
