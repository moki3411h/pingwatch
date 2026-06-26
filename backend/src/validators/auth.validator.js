const Joi = require('joi');

const register = Joi.object({
  name: Joi.string().min(2).max(100).trim().required()
    .messages({ 'string.min': 'Name must be at least 2 characters' }),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain uppercase, lowercase, and a number',
      'string.min': 'Password must be at least 8 characters',
    }),
});

const login = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

module.exports = { register, login };
