const axios = require('axios');
const pool = require('../db/pool');
const config = require('../config');
const logger = require('../utils/logger');
const { sendAlert } = require('./alert.service');

async function checkMonitor(monitor) {
  const startTime = Date.now();
  let statusCode = null;
  let isSuccess = false;
  let errorMsg = null;

  try {
    const response = await axios({
      method: monitor.method || 'GET',
      url: monitor.url,
      timeout: monitor.timeout_ms,
      headers: { 'User-Agent': 'PingWatch/1.0', ...(monitor.headers || {}) },
      validateStatus: () => true,
    });
    statusCode = response.status;
    isSuccess = statusCode === monitor.expected_status;
    if (!isSuccess) {
      errorMsg = `Expected status ${monitor.expected_status}, got ${statusCode}`;
    }
  } catch (err) {
    isSuccess = false;
    errorMsg = err.code === 'ECONNABORTED'
      ? `Timeout after ${monitor.timeout_ms}ms`
      : `Network error: ${err.message}`;
  }

  const latencyMs = Date.now() - startTime;

  await pool.query(
    `INSERT INTO ping_logs (monitor_id, status_code, latency_ms, is_success, error_msg)
     VALUES ($1, $2, $3, $4, $5)`,
    [monitor.id, statusCode, latencyMs, isSuccess, errorMsg]
  );

  if (!isSuccess) {
    const recentLogs = await pool.query(
      `SELECT is_success FROM ping_logs
       WHERE monitor_id = $1 ORDER BY checked_at DESC LIMIT $2`,
      [monitor.id, config.scheduler.failureThreshold]
    );
    const allFailed =
      recentLogs.rows.length === config.scheduler.failureThreshold &&
      recentLogs.rows.every((r) => !r.is_success);

    if (allFailed) {
      // Insert incident only if no open incident exists
      const incidentResult = await pool.query(
        `INSERT INTO incidents (monitor_id, type, description)
         SELECT $1, 'downtime', $2
         WHERE NOT EXISTS (
           SELECT 1 FROM incidents
           WHERE monitor_id = $1 AND is_resolved = false
         )
         RETURNING *`,
        [monitor.id,
         `Unreachable for ${config.scheduler.failureThreshold} consecutive checks`]
      );
      // If a new incident was created, send alert
      if (incidentResult.rows[0]) {
        sendAlert(monitor, incidentResult.rows[0]).catch((e) =>
          logger.error('Alert failed', { err: e.message })
        );
      }
    }
  } else {
    await pool.query(
      `UPDATE incidents SET is_resolved = true, resolved_at = NOW(),
       duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
       WHERE monitor_id = $1 AND is_resolved = false`,
      [monitor.id]
    );

    if (latencyMs > config.scheduler.latencyThreshold) {
      const incidentResult = await pool.query(
        `INSERT INTO incidents (monitor_id, type, description)
         SELECT $1, 'high_latency', $2
         WHERE NOT EXISTS (
           SELECT 1 FROM incidents
           WHERE monitor_id = $1 AND is_resolved = false AND type = 'high_latency'
         )
         RETURNING *`,
        [monitor.id,
         `Response time ${latencyMs}ms exceeds ${config.scheduler.latencyThreshold}ms`]
      );
      if (incidentResult.rows[0]) {
        sendAlert(monitor, incidentResult.rows[0]).catch((e) =>
          logger.error('Alert failed', { err: e.message })
        );
      }
    }
  }

  logger.debug('Check done', { url: monitor.url, isSuccess, latencyMs, statusCode });
  return { isSuccess, latencyMs, statusCode };
}

module.exports = { checkMonitor };
