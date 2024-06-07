/**
 * Matchmaking Service
 * Manages player matchmaking and match initialization.
 */

const Match = require('../models/Match');
const Player = require('../models/Player');
const Wager = require('../models/Wager');
const { postTransaction } = require('./hiveService');
const {determineBuyIn} = require('./manaService');
let waitingPlayers = new Set();
let activeMatches = {};
let matchCardSelections = {};
let matchDetails = {};

const joinWaitingRoom = async (player) => {
    // Check if player exists in the database
    let playerData = await Player.findOne({ username: player });
    console.log(`Player data: ${playerData}`);
    if (!playerData) {
        // Add new player to the database
        console.log(`Player ${player} not found. Adding to database...`);
        playerData = new Player({ username: player });
        await playerData.save();
    }

    // Implementation of joining waiting room
    waitingPlayers.add(player);
    return { success: true, message: 'Player added to waiting room' };
};

const createMatchmakingTransaction = async (players) => {
    const matchId = require('crypto').randomBytes(16).toString('hex');
    console.log('Creating matchmaking transaction for players:', players);
    // Determine the rank for the match based on the players' ranks
    const player1 = await Player.findOne({ username: players[0] });
    const player2 = await Player.findOne({ username: players[1] });
    let matchRank = player1.rank === player2.rank ? player1.rank : 'mixed';
    // Remove the number from the matchRank rookie 1 -> rookie
    matchRank = matchRank.replace(/[0-9]/g, '');
    // Remove the space in the rank
    matchRank = matchRank.replace(/\s/g, '');
    console.log(`Match rank: ${matchRank}`);
    const newMatch = await Match.create({
        // Remove the number from the matchRank rookie 1 -> rookie
        matchId: matchId,
        players: players,
        status: 'active',
        waitingFor: players, // Initially waiting for all players
        cardsPlayed: {},
        cardHashes: {},
        playerStats: {
            [players[0]]: { energy: 8, baseHealth: 15 },
            [players[1]]: { energy: 8, baseHealth: 15 }
        },
        rank: matchRank,
        totalManaPool: determineBuyIn(matchRank) * 2
    });
    // Create a wager for the match
    const wager = await Wager.create({
        matchId: matchId,
        player1: players[0],
        player2: players[1],
        player1Wager: determineBuyIn(matchRank),
        player2Wager: determineBuyIn(matchRank),
        playerStats: {
            [players[0]]: { status: 'pending' },
            [players[1]]: { status: 'pending' }
        },
        totalPool: determineBuyIn(matchRank) * 2,
        status: 'pending'
    });
    console.log('New match created:', newMatch);
    console.log('Creating match for:', players);
    initializeMatchDetails(matchId, players);
    const jsonData = {
        id: "MATCHMAKING_COMPLETE",
        player1Id: players[0],
        player2Id: players[1],
        matchId: matchId
    };
    await postTransaction(jsonData);
    activeMatches[players[0]] = matchId;
    activeMatches[players[1]] = matchId;
    console.log('Active matches:', activeMatches);
    return { success: true, matchId };
};

const initializeMatchDetails = (matchId, players) => {
    matchDetails[matchId] = {
        players: players,
        round: 1,
        waitingFor: players, // Initially waiting for all players
        cardsPlayed: {},
        cardHashes: {}
    };
};

const matchPlayersByRank = async () => {
    if (waitingPlayers.size < 2) return;

    const playersArray = await Promise.all(Array.from(waitingPlayers).map(async (player) => {
        const playerData = await Player.findOne({ username: player });
        if (!playerData) {
            console.error(`Player data not found for username: ${player}`);
            return null;
        }
        console.log('Players array:', playerData);
        return { username: player, xp: playerData.xp, rank: playerData.rank };
    }).filter(player => player !== null));
    playersArray.sort((a, b) => a.xp - b.xp);

    for (let i = 0; i < playersArray.length - 1; i++) {
        const player1 = playersArray[i];
        const player2 = playersArray[i + 1];
        console.log(`Matching players ${player1.username} and ${player2.username}`);
        console.log(`Player 1 rank: ${player1.rank}, Player 2 rank: ${player2.rank}`);
        if (Math.abs(player1.xp - player2.xp) <= 100 && player1.rank === player2.rank) {
            waitingPlayers.delete(player1.username);
            waitingPlayers.delete(player2.username);
            await createMatchmakingTransaction([player1.username, player2.username]);
            i++; // Skip the next player as they have been matched
        }
    }
};

module.exports = { joinWaitingRoom, createMatchmakingTransaction, waitingPlayers, matchCardSelections, matchPlayersByRank, activeMatches };
