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
    'rookie': 1,
    'adept': 100,
    'expert': 150,
    'master': 200,
    'grandmaster': 250,
    'transcendent': 250
};
const rankDailyManaMap = {
    'rookie': 1000,
    'adept': 2000,
    'expert': 3000,
    'master': 4000,
    'grandmaster': 5000,
    'transcendent': 5000
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
