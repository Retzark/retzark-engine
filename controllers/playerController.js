/**
 * Player Controller
 * Handles requests related to player profiles.
 */

const playerService = require('../services/playerService');
const {waitingPlayers, activeMatches} = require("../services/matchmakingService");

/**
 * Get Player Profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPlayerProfile = async (req, res) => {
    const username = req.params.username;
    const profile = await playerService.getPlayerProfile(username);
    console.log('waitingPlayers:', waitingPlayers);
    console.log('activeMatches:', activeMatches);
    if (waitingPlayers.has(username)) {
        console.log('Checking match status for:', username);
        res.json({profile, status: 'In waiting room' });
    } else if (activeMatches && activeMatches[username]){
        const matchId = activeMatches[username];
        console.log('activeMatches:', activeMatches);
        console.log('Match ID:', matchId);
        if (matchId) {
            res.json({profile,  status: 'In a match', matchId: matchId });
        } else {
            res.json({profile, status: 'No active match' });
        }
    } else {
        console.log('Player not in waiting room or active match');
        res.json({profile});
    }
};

/**
 * Update Player Profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updatePlayerProfile = async (req, res) => {
    const username = req.params.username;
    const updates = req.body;
    const updatedProfile = await playerService.updatePlayerProfile(username, updates);
    res.json(updatedProfile);
};

module.exports = { getPlayerProfile, updatePlayerProfile };
