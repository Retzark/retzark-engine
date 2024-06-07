/**
 * Rank Update Service
 * Handles updating player ranks and XP based on match outcomes.
 */

const Player = require('../models/Player');

const updateRank = async (winnerId, loserId, totalManaWagered) => {
    const winner = await Player.findOne({ username: winnerId });
    const loser = await Player.findOne({ username: loserId });

    const xpGained = calculateXPGained(totalManaWagered);
    winner.xp += xpGained;
    loser.xp -= xpGained / 2;

    if (loser.xp < 0) loser.xp = 0;

    await winner.save();
    await loser.save();
};

const calculateXPGained = (totalManaWagered) => {
    return totalManaWagered;
};

module.exports = { updateRank, calculateXPGained };
