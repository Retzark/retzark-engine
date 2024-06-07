/**
 * Leaderboard Controller
 * Handles requests related to the leaderboard.
 */

const leaderboardService = require('../services/leaderboardService');

/**
 * Get Leaderboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getLeaderboard = async (req, res) => {
    const leaderboard = await leaderboardService.getLeaderboard();
    res.json(leaderboard);
};

module.exports = { getLeaderboard };
