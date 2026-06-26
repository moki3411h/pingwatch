const express = require('express');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const authController = require('../controllers/auth.controller');
const authValidator = require('../validators/auth.validator');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

router.post('/register', authLimiter, validate(authValidator.register), authController.register);
router.post('/login', authLimiter, validate(authValidator.login), authController.login);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
