const { verifySignature } = require('../services/wageringService');
const { waitingPlayers, activeMatches, matchCardSelections } = require('../services/matchmakingService');
const { updateMatchDetailsHash } = require('../services/matchService');
const Player = require("../models/Player");
const Match = require("../models/Match");

const handleJoinRequest = async (data) => {
    const deckHash = JSON.parse(data.json).deckHash;
    console.log('Join request received:', data);
    let player = data.required_posting_auths[0];
    let playerData = await Player.findOne({ username: player });
    console.log(`Player data: ${playerData}`);
    if (!playerData) {
        console.log(`Player ${player} not found. Adding to database...`);
        playerData = new Player({ username: player });
        await playerData.save();
    }
    console.log("Player's name:", player);
    if (playerData.status === 'In waiting room' || playerData.status === 'In a match') {
        console.log(`Player ${player} is already in the waiting room or in a match.`);
        return;
    } else {
        waitingPlayers.add(player);
    }
    console.log('Waiting players:', Array.from(waitingPlayers).map(p => p.username));
};

const handleCardSelection = (data) => {
    console.log('Card selection received:', data);
    const player = data.required_posting_auths[0];
    const matchId = activeMatches[player];
    const cardHash = JSON.parse(data.json).hash;
    console.log(`Player ${player} selected card hash: ${cardHash}`);
    if (!matchId) {
        console.error(`Player ${player} is not in an active match`);
        return;
    }
    if (!matchCardSelections[matchId]) matchCardSelections[matchId] = {};
    if (!matchCardSelections[matchId][player]) matchCardSelections[matchId][player] = {};

    matchCardSelections[matchId][player].hash = cardHash;
    console.log(`Stored card hash for player ${player} in match ${matchId}`);
    // Update match details
    updateMatchDetailsHash(matchId, player, cardHash);
};

module.exports = { handleJoinRequest, handleCardSelection };
