const nodemailer = require('nodemailer');
const axios = require('axios');
const pool = require('../db/pool');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Creates a nodemailer transporter using SMTP credentials from config.
 * Called once per alert (not a singleton) so config changes take effect
 * without a restart.
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

/**
 * Sleep helper for exponential backoff.
 * Returns a Promise that resolves after `ms` milliseconds.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POST to a webhook URL with exponential backoff retry.
 *
 * Why exponential backoff?
 * If a webhook endpoint is temporarily overloaded, hammering it immediately
 * makes things worse. Waiting 1s, then 2s, then 4s gives it time to recover.
 * This is the standard pattern used by Stripe, GitHub, and every major
 * webhook provider.
 *
 * @param {string} url - webhook endpoint
 * @param {object} payload - JSON body to POST
 * @param {number} maxRetries - how many attempts (default 3)
 */
async function postWithRetry(url, payload, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await axios.post(url, payload, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'PingWatch/1.0' },
      });
      return; // success — exit the loop
    } catch (err) {
      lastError = err;
      logger.warn(`Webhook attempt ${attempt} failed`, {
        url,
        err: err.message,
      });

      if (attempt < maxRetries) {
        // Exponential backoff: 1000ms, 2000ms, 4000ms
        await sleep(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Write a record to alert_history so we can:
 * 1. Prevent duplicate alerts for the same incident
 * 2. Give the user an audit trail ("why didn't I get an email?")
 */
async function recordAlert(monitorId, incidentId, channel, status, payload, errorMsg = null) {
  await pool.query(
    `INSERT INTO alert_history
       (monitor_id, incident_id, channel, status, payload, error_msg)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [monitorId, incidentId, channel, status, JSON.stringify(payload), errorMsg]
  );
}

/**
 * Check whether an alert has already been sent for this incident on this channel.
 * Returns true if a 'sent' record already exists — meaning we should skip.
 *
 * Why check this?
 * The checker runs every N seconds. Without this check, every failed ping
 * would send a new email. The user would get hundreds of emails per incident.
 */
async function alreadyAlerted(incidentId, channel) {
  const result = await pool.query(
    `SELECT id FROM alert_history
     WHERE incident_id = $1 AND channel = $2 AND status = 'sent'
     LIMIT 1`,
    [incidentId, channel]
  );
  return result.rows.length > 0;
}

/**
 * Send an HTML email alert.
 *
 * Why HTML email? Plain text works but looks unprofessional in a portfolio
 * project. A simple HTML template shows attention to craft.
 */
async function sendEmailAlert(monitor, incident) {
  if (!monitor.alert_email) return;
  if (!config.smtp.user || !config.smtp.pass) {
    logger.warn('SMTP not configured — skipping email alert', { monitorId: monitor.id });
    return;
  }

  const alreadySent = await alreadyAlerted(incident.id, 'email');
  if (alreadySent) {
    logger.info('Email alert already sent for this incident — skipping', {
      incidentId: incident.id,
    });
    await recordAlert(monitor.id, incident.id, 'email', 'skipped', {});
    return;
  }

  const subject = incident.type === 'downtime'
    ? `🔴 [PingWatch] DOWN: ${monitor.name}`
    : `🟡 [PingWatch] HIGH LATENCY: ${monitor.name}`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:${incident.type === 'downtime' ? '#ef4444' : '#f59e0b'}">
        ${incident.type === 'downtime' ? '🔴 Service Down' : '🟡 High Latency Detected'}
      </h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;color:#6b7280">Monitor</td>
            <td style="padding:8px;font-weight:bold">${monitor.name}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">URL</td>
            <td style="padding:8px">${monitor.url}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Issue</td>
            <td style="padding:8px">${incident.description}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Started</td>
            <td style="padding:8px">${new Date(incident.started_at).toUTCString()}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">
        Sent by PingWatch — you will receive a recovery email when the service is back up.
      </p>
    </div>
  `;

  const payload = { to: monitor.alert_email, subject, monitorId: monitor.id };

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"PingWatch" <${config.smtp.user}>`,
      to: monitor.alert_email,
      subject,
      html,
    });
    await recordAlert(monitor.id, incident.id, 'email', 'sent', payload);
    logger.info('Email alert sent', { monitorId: monitor.id, to: monitor.alert_email });
  } catch (err) {
    await recordAlert(monitor.id, incident.id, 'email', 'failed', payload, err.message);
    logger.error('Email alert failed', { monitorId: monitor.id, err: err.message });
  }
}

/**
 * POST a JSON payload to the monitor's webhook URL.
 *
 * The payload format is intentional — it matches what Slack, Discord,
 * and most webhook receivers expect, so users can point this at Slack
 * and get instant notifications with zero extra config.
 */
async function sendWebhookAlert(monitor, incident) {
  if (!monitor.webhook_url) return;

  const alreadySent = await alreadyAlerted(incident.id, 'webhook');
  if (alreadySent) {
    await recordAlert(monitor.id, incident.id, 'webhook', 'skipped', {});
    return;
  }

  const payload = {
    event: 'incident.created',
    monitor: {
      id:   monitor.id,
      name: monitor.name,
      url:  monitor.url,
    },
    incident: {
      id:          incident.id,
      type:        incident.type,
      description: incident.description,
      started_at:  incident.started_at,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await postWithRetry(monitor.webhook_url, payload);
    await recordAlert(monitor.id, incident.id, 'webhook', 'sent', payload);
    logger.info('Webhook alert sent', { monitorId: monitor.id, url: monitor.webhook_url });
  } catch (err) {
    await recordAlert(monitor.id, incident.id, 'webhook', 'failed', payload, err.message);
    logger.error('Webhook alert failed after retries', {
      monitorId: monitor.id,
      err: err.message,
    });
  }
}

/**
 * Main export — called by checker.service after creating an incident.
 *
 * Runs email and webhook alerts concurrently with Promise.allSettled
 * so a failure in one doesn't prevent the other from running.
 */
async function sendAlert(monitor, incident) {
  await Promise.allSettled([
    sendEmailAlert(monitor, incident),
    sendWebhookAlert(monitor, incident),
  ]);
}

module.exports = { sendAlert };
