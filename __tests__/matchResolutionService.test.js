const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Match = require('../models/Match');
const Player = require('../models/Player');
const RetReward = require('../models/RetReward');
const { resolveMatch } = require('../services/matchResolutionService');

// Mock rankUpdateService
jest.mock('../services/rankUpdateService', () => ({
    updateRank: jest.fn().mockResolvedValue(true)
}));

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await Match.deleteMany({});
    await Player.deleteMany({});
    await RetReward.deleteMany({});

    // Create default RET rewards configuration
    await RetReward.create({
        rewards: {
            rookie1: 10,
            bronze1: 20
        }
    });
});

describe('Match Resolution Service', () => {
    describe('resolveMatch', () => {
        it('should update XP correctly for ranked matches', async () => {
            // Create test players
            const winner = await Player.create({
                username: 'winner',
                rank: 'rookie1',
                xp: 100,
                manaBalance: 1000
            });

            const loser = await Player.create({
                username: 'loser',
                rank: 'rookie1',
                xp: 200,
                manaBalance: 1000
            });

            // Create test match
            const match = await Match.create({
                matchId: 'test-match-1',
                players: ['winner', 'loser'],
                status: 'active',
                type: 'ranked',
                rank: 'rookie1',
                totalManaPool: 200 // 100 from each player
            });

            // Resolve match
            await resolveMatch(match.matchId, 'winner', 'loser', true, 200);

            // Check winner's XP gain
            const updatedWinner = await Player.findOne({ username: 'winner' });
            expect(updatedWinner.xp).toBe(300); // Initial 100 + 200 from mana pool

            // Check loser's XP loss
            const updatedLoser = await Player.findOne({ username: 'loser' });
            expect(updatedLoser.xp).toBe(100); // Initial 200 - 100 (half mana pool)

            // Verify match rewards
            const updatedMatch = await Match.findOne({ matchId: 'test-match-1' });
            expect(updatedMatch.rewards.xpGained).toBe(200);
            expect(updatedMatch.rewards.xpLost).toBe(100);
        });

        it('should not update XP for wagered matches', async () => {
            // Create test players
            const winner = await Player.create({
                username: 'winner',
                rank: 'rookie1',
                xp: 100,
                retBalance: 1000
            });

            const loser = await Player.create({
                username: 'loser',
                rank: 'rookie1',
                xp: 200,
                retBalance: 1000
            });

            // Create test match
            const match = await Match.create({
                matchId: 'test-match-2',
                players: ['winner', 'loser'],
                status: 'active',
                type: 'wagered',
                rank: 'rookie1',
                totalManaPool: 200
            });

            // Resolve match
            await resolveMatch(match.matchId, 'winner', 'loser', false, 200);

            // Check XP remains unchanged
            const updatedWinner = await Player.findOne({ username: 'winner' });
            expect(updatedWinner.xp).toBe(100);

            const updatedLoser = await Player.findOne({ username: 'loser' });
            expect(updatedLoser.xp).toBe(200);

            // Verify match rewards
            const updatedMatch = await Match.findOne({ matchId: 'test-match-2' });
            expect(updatedMatch.rewards.xpGained).toBe(0);
            expect(updatedMatch.rewards.xpLost).toBe(0);
        });

        it('should not allow XP to go below 0', async () => {
            // Create test players
            const winner = await Player.create({
                username: 'winner',
                rank: 'rookie1',
                xp: 100,
                manaBalance: 1000
            });

            const loser = await Player.create({
                username: 'loser',
                rank: 'rookie1',
                xp: 50, // Low XP to test floor
                manaBalance: 1000
            });

            // Create test match
            const match = await Match.create({
                matchId: 'test-match-3',
                players: ['winner', 'loser'],
                status: 'active',
                type: 'ranked',
                rank: 'rookie1',
                totalManaPool: 200
            });

            // Resolve match
            await resolveMatch(match.matchId, 'winner', 'loser', true, 200);

            // Check loser's XP doesn't go below 0
            const updatedLoser = await Player.findOne({ username: 'loser' });
            expect(updatedLoser.xp).toBe(0);
        });

        it('should record XP changes in mana history', async () => {
            // Create test players
            const winner = await Player.create({
                username: 'winner',
                rank: 'rookie1',
                xp: 100,
                manaBalance: 1000
            });

            const loser = await Player.create({
                username: 'loser',
                rank: 'rookie1',
                xp: 200,
                manaBalance: 1000
            });

            // Create test match
            const match = await Match.create({
                matchId: 'test-match-4',
                players: ['winner', 'loser'],
                status: 'active',
                type: 'ranked',
                rank: 'rookie1',
                totalManaPool: 200
            });

            // Resolve match
            await resolveMatch(match.matchId, 'winner', 'loser', true, 200);

            // Check mana history entries
            const updatedWinner = await Player.findOne({ username: 'winner' });
            const winnerHistory = updatedWinner.manaHistory[0];
            expect(winnerHistory.change).toBe(200);
            expect(winnerHistory.reason).toBe('Ranked match win XP gain');

            const updatedLoser = await Player.findOne({ username: 'loser' });
            const loserHistory = updatedLoser.manaHistory[0];
            expect(loserHistory.change).toBe(-100);
            expect(loserHistory.reason).toBe('Ranked match loss XP loss');
        });
    });
});
