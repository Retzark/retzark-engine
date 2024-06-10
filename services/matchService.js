/**
 * Match Service
 * Handles match-related operations such as retrieving match details, revealing cards, and resolving matches.
 */

const Match = require('../models/Match');
const Wager = require('../models/Wager');
const Player = require('../models/Player');
const { updateRank } = require('./rankUpdateService');
const { calculateMatchOutcome } = require('./gameLogicService');

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
        updateMatchDetailsCardsPlayed(matchId, player, cards);
        return { success: true, message: 'Cards revealed and verified' };
    }else {
        return { success: false, message: 'Card verification failed' };
    }
};

const resolveMatch = async (matchId, winnerId, loserId, isRanked, totalManaWagered) => {
    try {
        const match = await Match.findOne({ matchId });
        if (!match) throw new Error('Match not found');

        const update = {
            $set: {
                status: 'completed',
                winner: winnerId
            }
        };
        await Match.findOneAndUpdate({ matchId }, update, { new: true });

        if (isRanked) {
            await updateRank(winnerId, loserId, totalManaWagered);
        }

        return { success: true, message: 'Match resolved successfully' };
    } catch (error) {
        throw new Error(error.message);
    }
};

const updateMatchDetailsCardsPlayed = async (matchId, player, cards) => {
    try {
        const match = await Match.findOne({ matchId });
        if (!match) throw new Error('Match not found');
        console.log("Updating Cards Played for round", match.round, "player", player, "cards", cards);
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

        if (Object.keys(updatedMatch.cardsPlayed[updatedMatch.round]).length === updatedMatch.players.length) {
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
        const updatedMatch = await Match.findOneAndUpdate({ matchId }, update, { new: true });
        // Check if all players have submitted their card hashes for the current round
    } catch (error) {
        console.error('Error updating match details hash:', error);
    }
};
module.exports = { getMatchDetails, revealCards, resolveMatch, updateMatchDetailsHash, updateManaWagered, updateMatchDetailsCardsPlayed };
