const Joi = require('joi');

const create = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  method: Joi.string().valid('GET','POST','PUT','HEAD').default('GET'),
  interval_seconds: Joi.number().integer().min(30).max(86400).default(60),
  timeout_ms: Joi.number().integer().min(1000).max(30000).default(5000),
  expected_status: Joi.number().integer().min(100).max(599).default(200),
  alert_email: Joi.string().email().optional().allow(''),
  webhook_url: Joi.string().uri().optional().allow(''),
});

const update = Joi.object({
  name: Joi.string().min(2).max(100).trim(),
  url: Joi.string().uri({ scheme: ['http', 'https'] }),
  method: Joi.string().valid('GET','POST','PUT','HEAD'),
  interval_seconds: Joi.number().integer().min(30).max(86400),
  timeout_ms: Joi.number().integer().min(1000).max(30000),
  expected_status: Joi.number().integer().min(100).max(599),
  is_active: Joi.boolean(),
  alert_email: Joi.string().email().optional().allow(''),
  webhook_url: Joi.string().uri().optional().allow(''),
}).min(1);

module.exports = { create, update };
