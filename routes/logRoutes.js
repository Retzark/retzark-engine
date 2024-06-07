const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');

router.post('/log-event', logController.logMatchEvent);
router.get('/health', logController.monitorHealth);

module.exports = router;
