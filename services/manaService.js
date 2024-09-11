/**
 * Mana Service
 * Provides functionalities related to mana balance.
 */

const Player = require('../models/Player');

const rankMaxManaMap = {
    'rookie': 1000,
    'adept': 2000,
    'expert': 3000,
    'master': 4000,
    'grandmaster': 5000,
    'transcendent': 5000
};

const determineMaxMana = (rank) => {
    console.log('Determining max mana for rank:', rank, 'max-mana:', rankMaxManaMap[rank] || 1000);
    return rankMaxManaMap[rank] || 1000;
};

const getManaBalance = async (username) => {
    const player = await Player.findOne({ username });
    if (!player) return { success: false, message: 'Player not found' };
    return { maxManaBalance: player.maxManaBalance, currentManaBalance: player.currentManaBalance };
};

const rankBuyInMap = {
    'rookie': 1,
    'adept': 100,
    'expert': 150,
    'master': 200,
    'grandmaster': 250,
    'transcendent': 250
};

const determineBuyIn = (rank) => {
    console.log('Determining buy-in for rank:', rank, 'buy-in:', rankBuyInMap[rank] || 0);
    return rankBuyInMap[rank] || 0; // Return the buy-in for the given rank, or 0 if the rank is not found
};

const deductMana = async (username, amount) => {
    const player = await Player.findOne({ username });
    if (player.currentManaBalance < amount) {
        throw new Error('Insufficient mana');
    }
    player.currentManaBalance -= amount;
    player.manaHistory.push({
        change: -amount,
        reason: 'Match wager'
    });
    await player.save();
    console.log(`Deducted ${amount} mana from player ${username} (new balance: ${player.currentManaBalance})`);
};

module.exports = { determineMaxMana, getManaBalance, determineBuyIn, deductMana };
