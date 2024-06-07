const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/dashboard', adminController.getAdminDashboard);
router.post('/generate-report', adminController.generateReport);

module.exports = router;
