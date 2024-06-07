/**
 * Mana Service
 * Provides functionalities related to mana balance.
 */

const Player = require('../models/Player');

const getManaBalance = async (username) => {
    const player = await Player.findOne({ username });
    if (!player) return { success: false, message: 'Player not found' };
    return { manaBalance: player.manaBalance };
};

const rankBuyInMap = {
    'rookie': 5,
    'adept': 10,
    'expert': 15,
    'master': 20,
    'grandmaster': 25,
    'transcendent': 25
};

const determineBuyIn = (rank) => {
    console.log('Determining buy-in for rank:', rank, 'is there a space in the rank?', rankBuyInMap[rank]);
    return rankBuyInMap[rank] || 0; // Return the buy-in for the given rank, or 0 if the rank is not found
};

module.exports = { getManaBalance, determineBuyIn };
