const pool = require('../db/pool');

const list = async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT i.*, m.name as monitor_name, m.url as monitor_url
       FROM incidents i
       JOIN monitors m ON i.monitor_id = m.id
       WHERE m.user_id = $1
       ORDER BY i.started_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    const count = await pool.query(
      `SELECT COUNT(*) FROM incidents i
       JOIN monitors m ON i.monitor_id = m.id
       WHERE m.user_id = $1`,
      [req.user.id]
    );
    return res.json({
      incidents: result.rows,
      pagination: { page, limit, total: parseInt(count.rows[0].count), pages: Math.ceil(count.rows[0].count / limit) }
    });
  } catch (err) { next(err); }
};

const resolve = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE incidents i SET is_resolved = true, resolved_at = NOW(),
       duration_ms = EXTRACT(EPOCH FROM (NOW() - i.started_at)) * 1000
       FROM monitors m
       WHERE i.id = $1 AND i.monitor_id = m.id AND m.user_id = $2
       RETURNING i.*`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Incident not found' });
    return res.json({ incident: result.rows[0] });
  } catch (err) { next(err); }
};

module.exports = { list, resolve };
