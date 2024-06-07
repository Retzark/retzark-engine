/**
 * Match Controller
 * Handles requests related to match details and actions.
 */

const matchService = require('../services/matchService');

/**
 * Get Match Details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMatchDetails = async (req, res) => {
    const matchId = req.params.matchId;
    const matchDetails = await matchService.getMatchDetails(matchId);
    res.json(matchDetails);
};

/**
 * Reveal Cards
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const revealCards = async (req, res) => {
    const matchId = req.params.matchId;
    const { player, cards } = req.body;
    console.log(`Revealing cards for player ${player} in match ${matchId}:`, cards);
    const result = await matchService.revealCards(matchId, player, cards);
    res.json(result);
};

/**
 * Resolve Match
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resolveMatch = async (req, res) => {
    const { matchId, winnerId, loserId, isRanked, totalManaWagered } = req.body;
    try {
        const result = await matchService.resolveMatch(matchId, winnerId, loserId, isRanked, totalManaWagered);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};

module.exports = { getMatchDetails, revealCards, resolveMatch };
