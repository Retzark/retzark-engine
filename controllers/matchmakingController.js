/**
 * Matchmaking Controller
 * Handles requests related to player matchmaking.
 */

const matchmakingService = require('../services/matchmakingService');

/**
 * Join Waiting Room
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const joinWaitingRoom = async (req, res) => {
    const { player, rank, manaBet, deckHash } = req.body;
    const result = await matchmakingService.joinWaitingRoom(player, rank, manaBet, deckHash);
    res.json(result);
};

/**
 * Create Match
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createMatch = async (req, res) => {
    const players = req.body.players;
    const result = await matchmakingService.createMatchmakingTransaction(players);
    res.json(result);
};

module.exports = { joinWaitingRoom, createMatch };
