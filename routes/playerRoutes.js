const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');

router.get('/:username', playerController.getPlayerProfile);
router.put('/:username', playerController.updatePlayerProfile);

module.exports = router;
