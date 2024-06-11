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
const rankDailyManaMap = {
    'rookie': 100,
    'adept': 200,
    'expert': 300,
    'master': 400,
    'grandmaster': 500,
    'transcendent': 500
};

const determineBuyIn = (rank) => {
    console.log('Determining buy-in for rank:', rank, 'buy-in:', rankBuyInMap[rank] || 0);
    return rankBuyInMap[rank] || 0; // Return the buy-in for the given rank, or 0 if the rank is not found
};
const determineDailyMana = (rank) => {
    console.log('Determining daily mana for rank:', rank, 'daily-mana:', rankDailyManaMap[rank] || 0);
    return rankBuyInMap[rank] || 0; // Return the buy-in for the given rank, or 0 if the rank is not found
};

module.exports = { getManaBalance, determineBuyIn, determineDailyMana };
