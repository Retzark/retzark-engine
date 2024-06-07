/**
 * Leaderboard Service
 * Provides functionalities to retrieve leaderboard data.
 */

const Player = require('../models/Player');

const getLeaderboard = async () => {
    const leaderboard = await Player.find().sort({ xp: -1 }).limit(10);
    return leaderboard;
};

module.exports = { getLeaderboard };
