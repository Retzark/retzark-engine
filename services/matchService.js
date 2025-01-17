/**
 * Match Service
 * Handles match-related operations such as retrieving match details, revealing cards, and resolving matches.
 */

const Match = require('../models/Match');
const Wager = require('../models/Wager');
const Player = require('../models/Player');
const { calculateMatchOutcome } = require('./gameLogicService');
const { resolveMatch } = require('./matchResolutionService');
const {getTx} = require("./hiveService");
const {activeMatches, matchCardSelections} = require("./matchmakingService");
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getMatchDetails = async (matchId) => {
    const match = await Match.findOne({ matchId });
    return match;
};

const revealCards = async (matchId, player, cards) => {
    const match = await Match.findOne({ matchId });
    if (!match) return { success: false, message: 'Match not found' };
    if (match.status !== 'active') return { success: false, message: 'Match is not active' };

    const cardHash = require('crypto').createHash('sha256').update(JSON.stringify(cards)).digest('hex');
    console.log("Card hash:", cardHash);
    console.log("Match card hashes:", match);
    if (!match.cardHashes) {
        match.cardHashes = {};
    }
    if (!match.cardHashes[match.round]) {
        match.cardHashes[match.round] = {};
    }
    if (match.cardHashes[match.round][player] === cardHash) {
        await updateMatchDetailsCardsPlayed(matchId, player, cards);
        return { success: true, message: 'Cards revealed and verified' };
    }else {
        return { success: false, message: 'Card verification failed' };
    }
};

const updateMatchDetailsCardsPlayed = async (matchId, player, cards) => {
    try {
        const match = await Match.findOne({ matchId });
        if (!match) throw new Error('Match not found');
        // console.log("Updating Cards Played for round", match.round, "player", player, "cards", cards);
        if (!match.cardsPlayed) {
            match.cardsPlayed = {};
        }
        if (!match.cardsPlayed[match.round]) {
            match.cardsPlayed[match.round] = {};
        }
        const update = {
            $set: {
                [`cardsPlayed.${match.round}.${player}`]: cards
            }
        };
        const updatedMatch = await Match.findOneAndUpdate({ matchId }, update, { new: true });
        // Check if all players have played their cards for the current round
        if (updatedMatch && updatedMatch.cardsPlayed[updatedMatch.round] && 
            Object.keys(updatedMatch.cardsPlayed[updatedMatch.round]).length === updatedMatch.players.length) {
            // Calculate the outcome of the round
            const roundOutcome = calculateMatchOutcome(matchId);
            // Store the battle history and remaining cards in the match document
            await updatedMatch.save();
        }
    } catch (error) {
        console.error('Error updating match details cards played:', error);
    }
};

const updateManaWagered = async (matchId, player, manaAmount) => {
    try {
        const match = await Match.findOne({ matchId });
        if (!match) throw new Error('Match not found');

        match.totalManaPool += manaAmount;
        if (!match.playerManaWagered) {
            match.playerManaWagered = new Map();
        }
        if (!match.playerManaWagered.has(player)) {
            match.playerManaWagered.set(player, 0);
        }
        match.playerManaWagered.set(player, match.playerManaWagered.get(player) + manaAmount);
        await match.save();

        return { success: true, message: 'Mana wagered updated successfully', totalManaPool: match.totalManaPool, playerManaWagered: match.playerManaWagered.get(player) };
    } catch (error) {
        console.error('Error updating mana wagered:', error);
        return { success: false, message: error.message };
    }
};

const updateMatchDetailsHash = async (matchId, player, hash) => {
    try {
        const match = await Match.findOne({ matchId });
        if (!match) throw new Error('Match not found');
        console.log("Updating Card Hash for round", match.round, "player", player, "hash", hash);
        if (!match.cardHashes) {
            match.cardHashes = {};
        }
        if (!match.cardHashes[match.round]) {
            match.cardHashes[match.round] = {};
        }
        const update = {
            $set: {
                [`cardHashes.${match.round}.${player}`]: hash
            },
            $pull: {
                waitingFor: player
            }
        };
        console.log("Updating Card Hash for round", match.round, "player", player, "hash", hash);
        await Match.findOneAndUpdate({ matchId }, update, { new: true });
    } catch (error) {
        console.error('Error updating match details hash:', error);
    }
};

const surrenderMatch = async (matchId, player) => {
    try {
        const match = await Match.findOne({matchId});
        if (!match) throw new Error('Match not found');
        if (match.status !== 'active') throw new Error('Match is not active');
        if (!match.players.includes(player)) throw new Error('Player not found in match');
        const winner = match.players.find(p => p !== player);
        const loser = player;
        await resolveMatch(matchId, winner, loser, false, 0);
        return {success: true, message: 'Match surrendered successfully'};
    } catch (error) {
        console.error('Error surrendering match:', error);
        return {success: false, message: error.message};
    }
};

const submitCardsHash = async (txID) => {
    console.log("txID", txID);
    let i = 0;
    try {
        while (true){
            const transaction = await getTx(txID);
            if(transaction && transaction.operations){
                const data = transaction.operations;
                if (data[0][1].id !== 'RZ_CARD_SELECTION') {
                    console.error('Invalid operation ID');
                    return {success: false, message: 'Invalid operation ID'};
                }
                await handleCardSelection(data);
                console.log("Transaction data:", data);
                return {success: true, message: 'Card hash submitted'};
            }
            if(i > 20){
                return {success: true, message: 'Not able to find TX'};
            }
            await sleep(3000);
            i++;
        }
    } catch (error) {
        console.error('Error submitting card hash:', error);
        return {success: false, message: error.message};
    }
};

const submitDeck = async (matchId, player, deckHash, cardHashes) => {
    try {
        const match = await Match.findOne({ matchId });
        if (!match) {
            throw new Error('Match not found');
        }

        if (!match.players.includes(player)) {
            throw new Error('Player not in this match');
        }

        // Initialize decks if it doesn't exist
        if (!match.decks) {
            match.decks = {};
        }

        // Update the match with the submitted deck information
        match.decks[player] = { deckHash, cardHashes };

        // Check if both players have submitted their decks
        const submittedPlayers = Object.keys(match.decks);
        if (submittedPlayers.length === match.players.length) {
            match.status = 'decks_submitted';
        }

        await match.save();

        return {
            success: true,
            message: 'Deck submitted successfully',
            status: match.status
        };
    } catch (error) {
        throw error;
    }
};

const handleCardSelection = (data) => {
    console.log('Card selection received:', data);
    const player = data[0][1].required_posting_auths[0];
    const matchId = activeMatches[player];
    const cardHash = JSON.parse(data[0][1].json).hash;
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

module.exports = { 
    getMatchDetails, 
    revealCards, 
    updateMatchDetailsHash, 
    updateManaWagered, 
    updateMatchDetailsCardsPlayed, 
    surrenderMatch, 
    submitCardsHash, 
    submitDeck
};
