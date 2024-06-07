const express = require('express');
const router = express.Router();
const manaController = require('../controllers/manaController');

router.get('/:username', manaController.getManaBalance);

module.exports = router;
