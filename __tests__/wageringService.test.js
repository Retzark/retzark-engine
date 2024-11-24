const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Check, Bet, Call, Fold, Raise, generateComplianceReport, getMatchWagerDetails } = require('../services/wageringService');
const Wager = require('../models/Wager');
const Match = require('../models/Match');
const BetTransaction = require('../models/BetTransaction');

// Mock @hiveio/dhive
jest.mock('@hiveio/dhive', () => ({
    Client: jest.fn().mockImplementation(() => ({
        database: {
            getAccounts: jest.fn().mockResolvedValue([{
                posting: {
                    key_auths: [['test-public-key', 1]]
                }
            }])
        },
        broadcast: {
            verify: jest.fn().mockResolvedValue(true)
        }
    }))
}));

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
}, 30000);

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
}, 30000);

beforeEach(async () => {
    await Wager.deleteMany({});
    await Match.deleteMany({});
    await BetTransaction.deleteMany({});
});

describe('Wagering Service Tests', () => {
    let testMatch;
    let testWager;
    const player1 = 'player1';
    const player2 = 'player2';
    const matchId = 'test-match-123';
    const testSignature = 'test-signature-123';

    beforeEach(async () => {
        // Create test match
        testMatch = await Match.create({
            matchId,
            players: [player1, player2],
            status: 'in_progress',
            round: 1
        });

        // Create test wager
        testWager = await Wager.create({
            matchId,
            player1,
            player2,
            player1Wager: 100,
            player2Wager: 100,
            totalPool: 200,
            playerStats: new Map([
                [player1, { status: 'pending' }],
                [player2, { status: 'pending' }]
            ]),
            lastBetTime: new Date(),
            betTimeLimit: 30,
            betTransactions: [],
            expired: false
        });
    });

    describe('Check Function', () => {
        it('should allow player to check within time limit', async () => {
            const result = await Check(player1, matchId);
            expect(result.success).toBe(true);
            expect(result.message).toBe('checked successfully');

            const updatedWager = await Wager.findOne({ matchId });
            expect(updatedWager.playerStats.get(player1).status).toBe('checked');
        });

        it('should fail check if time limit exceeded', async () => {
            await Wager.updateOne(
                { matchId },
                { lastBetTime: new Date(Date.now() - 31000) }
            );

            const result = await Check(player1, matchId);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Bet time limit exceeded');
        });
    });

    describe('Compliance Report Generation', () => {
        beforeEach(async () => {
            // Create additional test wagers with different dates
            await Wager.create({
                matchId: 'past-match-1',
                player1: 'player3',
                player2: 'player4',
                player1Wager: 50,
                player2Wager: 50,
                totalPool: 100,
                createdAt: new Date('2023-01-01'),
                playerStats: new Map(),
                lastBetTime: new Date('2023-01-01'),
                betTimeLimit: 30,
                betTransactions: [],
                expired: false
            });

            await Wager.create({
                matchId: 'past-match-2',
                player1: 'player5',
                player2: 'player6',
                player1Wager: 75,
                player2Wager: 75,
                totalPool: 150,
                createdAt: new Date('2023-02-01'),
                playerStats: new Map(),
                lastBetTime: new Date('2023-02-01'),
                betTimeLimit: 30,
                betTransactions: [],
                expired: false
            });
        });

        it('should generate report for specified date range', async () => {
            const startDate = '2023-01-01';
            const endDate = '2023-02-28';
            
            const report = await generateComplianceReport(startDate, endDate);
            
            expect(report).toHaveLength(2);
            expect(report[0].matchId).toBe('past-match-1');
            expect(report[1].matchId).toBe('past-match-2');
        });

        it('should return empty array for date range with no wagers', async () => {
            const startDate = '2022-01-01';
            const endDate = '2022-12-31';
            
            const report = await generateComplianceReport(startDate, endDate);
            
            expect(report).toHaveLength(0);
        });

        it('should handle invalid date format', async () => {
            const startDate = 'invalid-date';
            const endDate = '2023-02-28';
            
            const report = await generateComplianceReport(startDate, endDate);
            
            expect(report).toHaveLength(0);
            
            // Test with invalid end date
            const report2 = await generateComplianceReport('2023-01-01', 'invalid-date');
            expect(report2).toHaveLength(0);
        });
    });

    describe('Match Wager Details', () => {
        it('should return wager details with time remaining', async () => {
            const details = await getMatchWagerDetails(matchId);
            
            expect(details).toBeDefined();
            expect(details.matchId).toBe(matchId);
            expect(details.player1).toBe(player1);
            expect(details.player2).toBe(player2);
            expect(details.timeRemaining).toBeDefined();
            expect(details.expired).toBe(false);
        });

        it('should return null for non-existent match', async () => {
            const details = await getMatchWagerDetails('non-existent-match');
            
            expect(details).toBeNull();
        });

        it('should calculate correct time remaining', async () => {
            // Set last bet time to 15 seconds ago
            const fifteenSecondsAgo = new Date(Date.now() - 15000);
            await Wager.updateOne(
                { matchId },
                { lastBetTime: fifteenSecondsAgo }
            );

            const details = await getMatchWagerDetails(matchId);
            
            // With 30 second bet time limit and 15 seconds elapsed
            expect(details.timeRemaining).toBeCloseTo(15, 0);
        });

        it('should mark wager as expired when time limit exceeded', async () => {
            // Set last bet time to 31 seconds ago
            const thirtyOneSecondsAgo = new Date(Date.now() - 31000);
            await Wager.updateOne(
                { matchId },
                { lastBetTime: thirtyOneSecondsAgo }
            );

            const details = await getMatchWagerDetails(matchId);
            expect(details.expired).toBe(true);
            expect(details.timeRemaining).toBeLessThanOrEqual(0);
        });
    });
});
