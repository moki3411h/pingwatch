const express = require('express');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const monitorValidator = require('../validators/monitor.validator');
const monitorController = require('../controllers/monitor.controller');

const router = express.Router();

// All monitor routes require authentication
router.use(authenticate);

router.post('/',   validate(monitorValidator.create), monitorController.create);
router.get('/',    monitorController.list);
router.get('/:id', monitorController.getOne);
router.patch('/:id', validate(monitorValidator.update), monitorController.update);
router.delete('/:id', monitorController.remove);
router.get('/:id/pings', monitorController.getPingHistory);

module.exports = router;
