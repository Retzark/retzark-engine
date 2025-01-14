/**
 * Match Resolution Service
 * Handles the resolution of matches, including RET rewards and rank updates.
 */

const Match = require('../models/Match');
const Player = require('../models/Player');
const RetReward = require('../models/RetReward');
const { updateRank } = require('./rankUpdateService');

const getRetReward = async (rank) => {
    const retRewards = await RetReward.findOne();
    if (!retRewards || !retRewards.rewards) {
        throw new Error('No RET rewards configuration found');
    }
    
    // Normalize rank to match the format in RetReward (lowercase, no spaces)
    const normalizedRank = rank.toLowerCase().replace(/\s+/g, '');
    const reward = retRewards.rewards[normalizedRank];
    
    if (typeof reward !== 'number') {
        throw new Error(`No reward found for rank: ${rank}`);
    }
    
    return reward;
};

const resolveMatch = async (matchId, winnerId, loserId, isRanked, totalManaWagered) => {
    try {
        const match = await Match.findOne({ matchId });
        if (!match) throw new Error('Match not found');

        // Get RET reward amount based on match rank
        const rewardAmount = await getRetReward(match.rank);

        // Find winner's and loser's player documents
        const winner = await Player.findOne({ username: winnerId });
        const loser = await Player.findOne({ username: loserId });
        if (!winner) throw new Error('Winner not found');
        if (!loser) throw new Error('Loser not found');

        // Update winner's RET balance and history
        winner.retBalance = (winner.retBalance || 0) + rewardAmount;
        winner.retHistory.push({
            date: new Date(),
            change: rewardAmount,
            matchId: matchId,
            reason: 'Match win reward'
        });

        // Update XP based on match type
        if (match.type === 'ranked') {
            // Winner gains full mana pool as XP
            winner.xp += match.totalManaPool;
            // Loser loses half mana pool as XP
            loser.xp = Math.max(0, loser.xp - Math.floor(match.totalManaPool / 2));

            // Add mana history entries
            winner.manaHistory.push({
                date: new Date(),
                change: match.totalManaPool,
                reason: 'Ranked match win XP gain'
            });
            loser.manaHistory.push({
                date: new Date(),
                change: -Math.floor(match.totalManaPool / 2),
                reason: 'Ranked match loss XP loss'
            });
        }

        await winner.save();
        await loser.save();

        // Update match with status, winner, and rewards
        match.status = 'completed';
        match.winner = winnerId;
        match.rewards = {
            retAmount: rewardAmount,
            retCredited: true,
            winner: winnerId,
            xpGained: match.type === 'ranked' ? match.totalManaPool : 0,
            xpLost: match.type === 'ranked' ? Math.floor(match.totalManaPool / 2) : 0
        };
        await match.save();

        if (isRanked) {
            await updateRank(winnerId, loserId, totalManaWagered);
        }

        return { 
            success: true, 
            message: 'Match resolved successfully', 
            retAwarded: rewardAmount,
            xpChanges: match.type === 'ranked' ? {
                winner: match.totalManaPool,
                loser: -Math.floor(match.totalManaPool / 2)
            } : null
        };
    } catch (error) {
        throw error;
    }
};

module.exports = { resolveMatch };
