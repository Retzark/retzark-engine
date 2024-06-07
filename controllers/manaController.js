/**
 * Mana Controller
 * Handles requests related to mana balance.
 */

const manaService = require('../services/manaService');

/**
 * Get Mana Balance
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getManaBalance = async (req, res) => {
    const username = req.params.username;
    const manaBalance = await manaService.getManaBalance(username);
    res.json(manaBalance);
};

module.exports = { getManaBalance };
