/**
 * Mana Service
 * Provides functionalities related to mana balance.
 */

const mongoose = require('mongoose');
const Player = require('../models/Player');

const rankMaxManaMap = {
    'rookie': 1000,
    'adept': 2000,
    'expert': 3000,
    'master': 4000,
    'grandmaster': 5000,
    'transcendent': 5000
};

const rankBuyInMap = {
    'rookie': 10,
    'adept': 20,
    'expert': 30,
    'master': 40,
    'grandmaster': 50,
    'transcendent': 50
};

const rankMaxBetMap = {
    'rookie': 100,
    'adept': 200,
    'expert': 300,
    'master': 400,
    'grandmaster': 500,
    'transcendent': 500
};

const determineMaxMana = (rank) => {
    console.log('Determining max mana for rank:', rank, 'max-mana:', rankMaxManaMap[rank] || 1000);
    return rankMaxManaMap[rank] || 1000;
};

const getManaBalance = async (username) => {
    const player = await Player.findOne({ username });
    if (!player) return { success: false, message: 'Player not found' };
    return { maxManaBalance: player.maxManaBalance, manaBalance: player.manaBalance };
};

const getMaxBetForRank = (rank) => {
    console.log('Determining max bet for rank:', rank, 'max-bet:', rankMaxBetMap[rank] || 0);
    return rankMaxBetMap[rank] || 0;
};

const determineBuyIn = (rank) => {
    console.log('Determining buy-in for rank:', rank, 'buy-in:', rankBuyInMap[rank] || 0);
    return rankBuyInMap[rank] || 0;
};

const deductMana = async (username, amount) => {
    // Use findOneAndUpdate with atomic operations
    const updatedPlayer = await Player.findOneAndUpdate(
        { 
            username,
            manaBalance: { $gte: amount } // Ensure sufficient balance
        },
        {
            $inc: { manaBalance: -amount },
            $push: {
                manaHistory: {
                    change: -amount,
                    reason: 'Match wager',
                    timestamp: new Date()
                }
            }
        },
        { 
            new: true,
            runValidators: true,
            useFindAndModify: false // Address deprecation warning
        }
    );

    if (!updatedPlayer) {
        throw new Error('Insufficient mana');
    }

    console.log(`Deducted ${amount} mana from player ${username} (new balance: ${updatedPlayer.manaBalance})`);
    return updatedPlayer;
};

module.exports = { 
    determineMaxMana, 
    getManaBalance, 
    determineBuyIn, 
    deductMana,
    getMaxBetForRank 
};
