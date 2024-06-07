/**
 * Player Service
 * Provides functionalities related to player profiles.
 */

const Player = require('../models/Player');

const getPlayerProfile = async (username) => {
    const player = await Player.findOne({ username });
    return player;
};

const updatePlayerProfile = async (username, updates) => {
    const updatedPlayer = await Player.findOneAndUpdate({ username }, updates, { new: true });
    return updatedPlayer;
};

module.exports = { getPlayerProfile, updatePlayerProfile };
