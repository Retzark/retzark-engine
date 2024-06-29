const express = require('express');
const router = express.Router();
const { getAffiliateEarnings } = require('../controllers/affiliateController');

// Endpoint to get affiliate earnings
router.get('/earnings/:affiliateCode', getAffiliateEarnings);

module.exports = router;
