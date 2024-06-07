/**
 * Rank Controller
 * Handles requests related to player ranks.
 */

const rankService = require('../services/rankService');

/**
 * Get Rank
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRank = async (req, res) => {
    const username = req.params.username;
    const rankInfo = await rankService.getRank(username);
    res.json(rankInfo);
};

module.exports = { getRank };
