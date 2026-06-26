const express = require('express');
const authenticate = require('../middleware/auth.middleware');
const incidentController = require('../controllers/incident.controller');

const router = express.Router();
router.use(authenticate);
router.get('/', incidentController.list);
router.patch('/:id/resolve', incidentController.resolve);

module.exports = router;
