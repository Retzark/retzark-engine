/**
 * Rank Service
 * Provides functionalities to retrieve player rank and XP.
 */

const Player = require('../models/Player');

const getRank = async (username) => {
    const player = await Player.findOne({ username });
    if (!player) return { success: false, message: 'Player not found' };
    return { rank: player.rank, xp: player.xp };
};

module.exports = { getRank };
