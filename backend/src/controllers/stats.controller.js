const { getMonitorStats } = require('../services/stats.service');

/**
 * GET /api/stats/:monitorId
 *
 * Returns uptime, error rate, avg latency, and p95 latency
 * for the last 24h, 7d, and 30d windows.
 *
 * The service handles IDOR protection — if the monitor doesn't
 * belong to req.user.id, it throws a 404 error which lands
 * in the global error handler.
 */
const getStats = async (req, res, next) => {
  try {
    const stats = await getMonitorStats(req.params.monitorId, req.user.id);
    return res.json(stats);
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats };
