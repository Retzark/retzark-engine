const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

router.get('/:matchId', matchController.getMatchDetails);
router.post('/reveal/:matchId', matchController.revealCards);
router.post('/resolve', matchController.resolveMatch);
router.post('/joinWaitingRoom', matchController.joinWaitingRoom);
router.post('/surrender', matchController.surrenderMatch);
router.post('/submitCardsHash', matchController.submitCardsHash);
module.exports = router;
