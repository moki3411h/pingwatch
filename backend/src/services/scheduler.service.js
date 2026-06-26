const pool = require('../db/pool');
const logger = require('../utils/logger');
const { checkMonitor } = require('./checker.service');

const activeJobs = new Map();

function scheduleMonitor(monitor) {
  if (activeJobs.has(monitor.id)) {
    clearInterval(activeJobs.get(monitor.id));
  }
  const job = setInterval(async () => {
    try {
      await checkMonitor(monitor);
    } catch (err) {
      logger.error('Check error', { monitorId: monitor.id, err: err.message });
    }
  }, monitor.interval_seconds * 1000);

  activeJobs.set(monitor.id, job);
  logger.info('Monitor scheduled', { id: monitor.id, url: monitor.url });
}

function unscheduleMonitor(monitorId) {
  if (activeJobs.has(monitorId)) {
    clearInterval(activeJobs.get(monitorId));
    activeJobs.delete(monitorId);
  }
}

async function startScheduler() {
  const result = await pool.query('SELECT * FROM monitors WHERE is_active = true');
  logger.info(`Loading ${result.rows.length} active monitors`);
  if (result.rows.length > 0) {
    await Promise.allSettled(result.rows.map(m => checkMonitor(m).catch(e =>
      logger.error('Initial check failed', { monitorId: m.id, err: e.message })
    )));
    result.rows.forEach(scheduleMonitor);
  }
}

module.exports = { startScheduler, scheduleMonitor, unscheduleMonitor };
