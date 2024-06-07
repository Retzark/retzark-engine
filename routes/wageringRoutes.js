const express = require('express');
const router = express.Router();
const wageringController = require('../controllers/wageringController');

router.post('/check', wageringController.Check);
router.post('/bet', wageringController.Bet);
router.post('/call', wageringController.Call);
router.post('/raise', wageringController.Raise);
router.post('/fold', wageringController.Fold);
router.get('/:matchId', wageringController.getMatchWagerDetails);
router.get('/complianceReport', wageringController.getComplianceReport);

module.exports = router;
