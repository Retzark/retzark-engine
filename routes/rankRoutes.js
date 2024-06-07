const express = require('express');
const router = express.Router();
const rankController = require('../controllers/rankController');

router.get('/:username', rankController.getRank);

module.exports = router;
