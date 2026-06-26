const pool = require('../db/pool');

/**
 * Calculate stats for one monitor across three time windows.
 *
 * Why Promise.all here?
 * All three queries are independent — they don't need each other's results.
 * Running them in parallel cuts response time from ~90ms to ~30ms.
 *
 * Why PERCENTILE_CONT?
 * Average latency is misleading. If 95% of requests take 100ms but 5%
 * take 10,000ms, the average might be 600ms — a number that describes
 * nothing accurately. p95 tells you "95% of users saw a response faster
 * than this number." That's what matters.
 *
 * Why FILTER (WHERE is_success = true)?
 * This is a SQL aggregate filter — cleaner than a CASE WHEN expression
 * and supported in PostgreSQL 9.4+. It counts only the rows matching
 * the condition within the aggregate function.
 */

async function getWindowStats(monitorId, intervalExpression) {
  const result = await pool.query(
    `SELECT
       COUNT(*)                                          AS total_checks,
       COUNT(*) FILTER (WHERE is_success = true)        AS successful_checks,
       COUNT(*) FILTER (WHERE is_success = false)       AS failed_checks,
       ROUND(AVG(latency_ms))                           AS avg_latency_ms,
       PERCENTILE_CONT(0.95) WITHIN GROUP (
         ORDER BY latency_ms
       )                                                AS p95_latency_ms
     FROM ping_logs
     WHERE monitor_id = $1
       AND checked_at > NOW() - INTERVAL '${intervalExpression}'`,
    [monitorId]
  );

  const row = result.rows[0];
  const total = parseInt(row.total_checks, 10);

  // Guard against division by zero — return null instead of NaN or Infinity
  const uptimePercent = total > 0
    ? parseFloat(((parseInt(row.successful_checks, 10) / total) * 100).toFixed(2))
    : null;

  const errorRate = total > 0
    ? parseFloat(((parseInt(row.failed_checks, 10) / total) * 100).toFixed(2))
    : null;

  return {
    total_checks:      total,
    successful_checks: parseInt(row.successful_checks, 10),
    failed_checks:     parseInt(row.failed_checks, 10),
    uptime_percent:    uptimePercent,
    error_rate:        errorRate,
    avg_latency_ms:    row.avg_latency_ms ? parseInt(row.avg_latency_ms, 10) : null,
    p95_latency_ms:    row.p95_latency_ms ? Math.round(parseFloat(row.p95_latency_ms)) : null,
  };
}

/**
 * Main export — verifies ownership then fetches stats for all 3 windows.
 *
 * IDOR protection: we check that the monitor belongs to this user
 * BEFORE running any stats queries. Without this check, any logged-in
 * user could pass any monitorId and read another user's data.
 *
 * IDOR = Insecure Direct Object Reference — a top-10 OWASP vulnerability.
 */
async function getMonitorStats(monitorId, userId) {
  // Ownership check
  const ownership = await pool.query(
    'SELECT id FROM monitors WHERE id = $1 AND user_id = $2',
    [monitorId, userId]
  );

  if (!ownership.rows[0]) {
    const err = new Error('Monitor not found');
    err.status = 404;
    throw err;
  }

  // Run all three window queries concurrently
  const [stats24h, stats7d, stats30d] = await Promise.all([
    getWindowStats(monitorId, '24 hours'),
    getWindowStats(monitorId, '7 days'),
    getWindowStats(monitorId, '30 days'),
  ]);

  return {
    monitor_id: monitorId,
    windows: {
      last_24h: stats24h,
      last_7d:  stats7d,
      last_30d: stats30d,
    },
  };
}

module.exports = { getMonitorStats };
