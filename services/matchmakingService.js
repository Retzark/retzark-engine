/**
 * Matchmaking Service
 * Manages player matchmaking and match initialization.
 */

const Match = require('../models/Match');
const Player = require('../models/Player');
const Wager = require('../models/Wager');
const { postTransaction, getTx } = require('./hiveService');
const { getMaxBetForRank, determineBuyIn } = require('./manaService');
let waitingPlayers = new Set();
let activeMatches = {};
let matchCardSelections = {};
let matchDetails = {};
// Utility function to pause execution for a given time
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const joinWaitingRoom = async (txID, player) => {
    console.log("txID", txID);
    let i = 0;
    try {
        let playerData = await Player.findOne({username: player});
        if (!playerData) {
            playerData = new Player({username: player});
            await playerData.save();
        }
        while (true){
            const transaction = await getTx(txID);
            if(transaction && transaction.operations){
                const data = transaction.operations;
                if (data[0][1].id !== 'RZ_JOIN_WAITING_ROOM') {
                    console.error('Invalid operation ID');
                    return {success: false, message: 'Invalid operation ID'};
                }
                await handleJoinRequest(data);
                console.log("Transaction data:", data);
                return {success: true, message: 'Player added to waiting room'};
            }
            if(i > 20){
                return {success: true, message: 'Not able to find TX'};
            }
            await sleep(3000)
            i++
        }
    } catch (error) {
        console.error('Error joining waiting room:', error);
        return {success: false, message: error.message};
    }
}

const handleJoinRequest = async (data) => {
    let player = data[0][1].required_posting_auths[0];
    console.log('Join request received:', player);

    // Parse the custom JSON data to get match type
    const jsonData = JSON.parse(data[0][1].json);
    const matchType = jsonData.matchType || 'ranked'; // Default to ranked if not specified

    let playerData = await Player.findOne({ username: player });
    console.log(`Player data: ${playerData}`);
    if (!playerData) {
        console.log(`Player ${player} not found. Adding to database...`);
        playerData = new Player({ username: player });
        await playerData.save();
    }

    if (playerData.status === 'In waiting room' || playerData.status === 'In a match') {
        console.log(`Player ${player} is already in the waiting room or in a match.`);
        return;
    } else {
        // Store player with their preferred match type
        waitingPlayers.add(JSON.stringify({
            username: player,
            matchType: matchType
        }));
    }
    console.log('Waiting players:', Array.from(waitingPlayers));
};

const createMatchmakingTransaction = async (players, matchType) => {
    const matchId = require('crypto').randomBytes(16).toString('hex');
    console.log('Creating matchmaking transaction for players:', players);
    // Determine the rank for the match based on the players' ranks
    const player1 = await Player.findOne({ username: players[0] });
    const player2 = await Player.findOne({ username: players[1] });
    let matchRank = player1.rank === player2.rank ? player1.rank : 'mixed';
    // Remove the space in the rank
    matchRank = matchRank.replace(/\s/g, '');
    console.log(`Match rank: ${matchRank}`);
    const buyIn = await determineBuyIn(matchRank);
    const maxBet = getMaxBetForRank(matchRank);

    const newMatch = await Match.create({
        matchId: matchId,
        players: players,
        // deckHashes: {
        //     [players[0].username]: players[0].deckHash,
        //     [players[1].username]: players[1].deckHash
        // },
        status: 'active',
        waitingFor: players, // Initially waiting for all players
        cardsPlayed: {},
        cardHashes: {},
        playerStats: {
            [players[0]]: { energy: 8, baseHealth: 15 },
            [players[1]]: { energy: 8, baseHealth: 15 }
        },
        rank: matchRank,
        type: matchType, // Set the match type
        totalManaPool: buyIn * 2,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    // Create a wager for the match
    const wager = await Wager.create({
        matchId: matchId,
        player1: players[0],
        player2: players[1],
        player1Wager: buyIn,
        player2Wager: buyIn,
        maxWager: maxBet,
        wagerType: matchType === 'wagered' ? 'ret' : 'mana',
        playerStats: {
            [players[0]]: { status: 'pending' },
            [players[1]]: { status: 'pending' }
        },
        totalPool: buyIn * 2,
        status: 'pending',
        round: 1,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    console.log('New match created:', newMatch);
    console.log('Creating match for:', players);
    initializeMatchDetails(matchId, players);
    const jsonData = {
        id: "MATCHMAKING_COMPLETE",
        player1Id: players[0],
        player2Id: players[1],
        matchId: matchId,
        matchType: matchType
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

    const playersArray = await Promise.all(Array.from(waitingPlayers).map(async (playerJson) => {
        const playerInfo = JSON.parse(playerJson);
        const playerData = await Player.findOne({ username: playerInfo.username });
        if (!playerData) {
            console.error(`Player data not found for username: ${playerInfo.username}`);
            return null;
        }
        console.log('Players array:', playerData);
        return {
            username: playerInfo.username,
            xp: playerData.xp,
            rank: playerData.rank,
            matchType: playerInfo.matchType
        };
    }).filter(player => player !== null));

    playersArray.sort((a, b) => a.xp - b.xp);

    for (let i = 0; i < playersArray.length - 1; i++) {
        const player1 = playersArray[i];
        const player2 = playersArray[i + 1];
        console.log(`Matching players ${player1.username} and ${player2.username}`);
        console.log(`Player 1 rank: ${player1.rank}, Player 2 rank: ${player2.rank}`);

        // Only try to match players if they have same rank, similar XP, and same match type
        if (Math.abs(player1.xp - player2.xp) <= 1000 &&
            player1.rank === player2.rank &&
            player1.matchType === player2.matchType) {

            const buyIn = await determineBuyIn(player1.rank);

            // Check if players have enough balance based on match type
            const player1Data = await Player.findOne({ username: player1.username });
            const player2Data = await Player.findOne({ username: player2.username });

            if (!player1Data || !player2Data) {
                console.log('Player data not found');
                continue;
            }

            // Check balances based on match type
            if (player1.matchType === 'wagered') {
                // Check RET balance for wagered matches
                if (player1Data.retBalance < buyIn) {
                    waitingPlayers.delete(JSON.stringify({
                        username: player1.username,
                        matchType: player1.matchType
                    }));
                    console.log(`Player ${player1.username} does not have enough RET to play.`);
                    continue;
                }
                if (player2Data.retBalance < buyIn) {
                    waitingPlayers.delete(JSON.stringify({
                        username: player2.username,
                        matchType: player2.matchType
                    }));
                    playersArray.splice(i + 1, 1);
                    console.log(`Player ${player2.username} does not have enough RET to play.`);
                    i--;
                    continue;
                }
            } else {
                // Check MANA balance for ranked matches
                if (player1Data.manaBalance < buyIn) {
                    waitingPlayers.delete(JSON.stringify({
                        username: player1.username,
                        matchType: player1.matchType
                    }));
                    console.log(`Player ${player1.username} does not have enough MANA to play.`);
                    continue;
                }
                if (player2Data.manaBalance < buyIn) {
                    waitingPlayers.delete(JSON.stringify({
                        username: player2.username,
                        matchType: player2.matchType
                    }));
                    playersArray.splice(i + 1, 1);
                    console.log(`Player ${player2.username} does not have enough MANA to play.`);
                    i--;
                    continue;
                }
            }

            // If we get here, both players have sufficient balance
            waitingPlayers.delete(JSON.stringify({
                username: player1.username,
                matchType: player1.matchType
            }));
            waitingPlayers.delete(JSON.stringify({
                username: player2.username,
                matchType: player2.matchType
            }));
            await createMatchmakingTransaction([player1.username, player2.username], player1.matchType);
            i++; // Skip the next player as they have been matched
        }
    }
};

module.exports = { joinWaitingRoom, createMatchmakingTransaction, waitingPlayers, matchCardSelections, matchPlayersByRank, activeMatches };
