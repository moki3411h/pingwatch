const pool = require('../db/pool');
const logger = require('../utils/logger');
const { scheduleMonitor, unscheduleMonitor } = require('../services/scheduler.service');
const { checkMonitor } = require('../services/checker.service');

const create = async (req, res, next) => {
  const { name, url, method, interval_seconds, timeout_ms, expected_status, alert_email, webhook_url } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO monitors (user_id, name, url, method, interval_seconds, timeout_ms, expected_status, alert_email, webhook_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, name, url, method, interval_seconds, timeout_ms, expected_status, alert_email || null, webhook_url || null]
    );
    const monitor = result.rows[0];
    scheduleMonitor(monitor);
    // Run an immediate check so dashboard shows data instantly
    checkMonitor(monitor).catch(e => logger.error('Immediate check failed', { e: e.message }));
    logger.info('Monitor created', { id: monitor.id, url: monitor.url });
    return res.status(201).json({ monitor });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT m.*,
        (SELECT COUNT(*) FROM ping_logs WHERE monitor_id = m.id) as total_checks,
        (SELECT COUNT(*) FROM ping_logs WHERE monitor_id = m.id AND is_success = true) as successful_checks,
        (SELECT latency_ms FROM ping_logs WHERE monitor_id = m.id ORDER BY checked_at DESC LIMIT 1) as last_latency_ms,
        (SELECT checked_at FROM ping_logs WHERE monitor_id = m.id ORDER BY checked_at DESC LIMIT 1) as last_checked_at,
        (SELECT is_success FROM ping_logs WHERE monitor_id = m.id ORDER BY checked_at DESC LIMIT 1) as last_status
       FROM monitors m
       WHERE m.user_id = $1
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    const monitors = result.rows.map(m => ({
      ...m,
      uptime_percent: m.total_checks > 0
        ? ((m.successful_checks / m.total_checks) * 100).toFixed(2)
        : null,
    }));
    return res.json({ monitors });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM monitors WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Monitor not found' });
    return res.json({ monitor: result.rows[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  const fields = req.body;
  const keys = Object.keys(fields);
  if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = [...keys.map(k => fields[k]), req.params.id, req.user.id];

  try {
    const result = await pool.query(
      `UPDATE monitors SET ${setClauses}
       WHERE id = $${keys.length + 1} AND user_id = $${keys.length + 2}
       RETURNING *`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Monitor not found' });
    const monitor = result.rows[0];
    // Reschedule with new settings
    unscheduleMonitor(monitor.id);
    if (monitor.is_active) scheduleMonitor(monitor);
    return res.json({ monitor });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM monitors WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Monitor not found' });
    unscheduleMonitor(req.params.id);
    return res.status(204).send();
  } catch (err) { next(err); }
};

const getPingHistory = async (req, res, next) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  try {
    const ownership = await pool.query(
      'SELECT id FROM monitors WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!ownership.rows[0]) return res.status(404).json({ error: 'Monitor not found' });

    const result = await pool.query(
      `SELECT status_code, latency_ms, is_success, error_msg, checked_at
       FROM ping_logs WHERE monitor_id = $1
       ORDER BY checked_at DESC LIMIT $2`,
      [req.params.id, limit]
    );
    return res.json({ ping_logs: result.rows });
  } catch (err) { next(err); }
};

module.exports = { create, list, getOne, update, remove, getPingHistory };
