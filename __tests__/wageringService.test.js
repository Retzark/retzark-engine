const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Check, Bet, Call, Fold, Raise } = require('../services/wageringService');
const Wager = require('../models/Wager');
const Match = require('../models/Match');
const BetTransaction = require('../models/BetTransaction');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

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
            ])
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
            // Set last bet time to more than 30 seconds ago
            await Wager.updateOne(
                { matchId },
                { lastBetTime: new Date(Date.now() - 31000) }
            );

            const result = await Check(player1, matchId);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Bet time limit exceeded');
        });
    });

    describe('Bet Function', () => {
        it('should allow player to bet within time limit', async () => {
            const result = await Bet(player1, matchId, 50, testSignature);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Wager placed successfully');

            const updatedWager = await Wager.findOne({ matchId });
            expect(updatedWager.playerStats.get(player1).status).toBe('bet');
            expect(updatedWager.betTransactions).toHaveLength(1);
        });

        it('should fail bet if time limit exceeded', async () => {
            await Wager.updateOne(
                { matchId },
                { lastBetTime: new Date(Date.now() - 31000) }
            );

            const result = await Bet(player1, matchId, 50, testSignature);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Bet time limit exceeded');
        });
    });

    describe('Call Function', () => {
        let betTransaction;

        beforeEach(async () => {
            betTransaction = await BetTransaction.create({
                matchId,
                player: player1,
                round: 1,
                amount: 50,
                type: 'bet',
                signature: testSignature
            });

            await Wager.updateOne(
                { matchId },
                { $push: { betTransactions: {
                    transactionId: betTransaction._id,
                    status: 'pending',
                    amount: 50,
                    betType: 'bet'
                }}}
            );
        });

        it('should allow player to call within time limit', async () => {
            const result = await Call(matchId, player2, testSignature, betTransaction._id);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Bet Called');

            const updatedWager = await Wager.findOne({ matchId });
            expect(updatedWager.status).toBe('called');
            expect(updatedWager.playerStats.get(player2).status).toBe('called');
        });

        it('should fail call if time limit exceeded', async () => {
            await Wager.updateOne(
                { matchId },
                { lastBetTime: new Date(Date.now() - 31000) }
            );

            const result = await Call(matchId, player2, testSignature, betTransaction._id);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Bet time limit exceeded');
        });
    });

    describe('Raise Function', () => {
        let betTransaction;

        beforeEach(async () => {
            betTransaction = await BetTransaction.create({
                matchId,
                player: player1,
                round: 1,
                amount: 50,
                type: 'bet',
                signature: testSignature
            });

            await Wager.updateOne(
                { matchId },
                { $push: { betTransactions: {
                    transactionId: betTransaction._id,
                    status: 'pending',
                    amount: 50,
                    betType: 'bet'
                }}}
            );
        });

        it('should allow player to raise within time limit', async () => {
            const result = await Raise(matchId, player2, testSignature, betTransaction._id, 100);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Bet Raised');

            const updatedWager = await Wager.findOne({ matchId });
            expect(updatedWager.status).toBe('raised');
            expect(updatedWager.playerStats.get(player2).status).toBe('raised');
        });

        it('should fail raise if time limit exceeded', async () => {
            await Wager.updateOne(
                { matchId },
                { lastBetTime: new Date(Date.now() - 31000) }
            );

            const result = await Raise(matchId, player2, testSignature, betTransaction._id, 100);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Bet time limit exceeded');
        });
    });

    describe('Fold Function', () => {
        let betTransaction;

        beforeEach(async () => {
            betTransaction = await BetTransaction.create({
                matchId,
                player: player1,
                round: 1,
                amount: 50,
                type: 'bet',
                signature: testSignature
            });

            await Wager.updateOne(
                { matchId },
                { $push: { betTransactions: {
                    transactionId: betTransaction._id,
                    status: 'pending',
                    amount: 50,
                    betType: 'bet'
                }}}
            );
        });

        it('should allow player to fold within time limit', async () => {
            const result = await Fold(matchId, player2, testSignature, betTransaction._id);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Bet Folded');

            const updatedWager = await Wager.findOne({ matchId });
            expect(updatedWager.status).toBe('folded');
            expect(updatedWager.playerStats.get(player2).status).toBe('folded');
        });

        it('should fail fold if time limit exceeded', async () => {
            await Wager.updateOne(
                { matchId },
                { lastBetTime: new Date(Date.now() - 31000) }
            );

            const result = await Fold(matchId, player2, testSignature, betTransaction._id);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Bet time limit exceeded');
        });
    });

    describe('Time Limit Enforcement', () => {
        it('should correctly identify winner when time limit exceeded', async () => {
            await Wager.updateOne(
                { matchId },
                { lastBetTime: new Date(Date.now() - 31000) }
            );

            // Player1 attempts action after time limit
            const result = await Check(player1, matchId);
            expect(result.success).toBe(false);
            expect(result.message).toContain(player2); // Should mention player2 as winner

            const updatedMatch = await Match.findOne({ matchId });
            expect(updatedMatch.status).toBe('completed');
            expect(updatedMatch.winner).toBe(player2);

            const updatedWager = await Wager.findOne({ matchId });
            expect(updatedWager.status).toBe('forfeited');
            expect(updatedWager.winner).toBe(player2);
        });

        it('should reset timer after successful action', async () => {
            const initialResult = await Check(player1, matchId);
            expect(initialResult.success).toBe(true);

            const updatedWager = await Wager.findOne({ matchId });
            const timeDiff = new Date() - updatedWager.lastBetTime;
            expect(timeDiff).toBeLessThan(1000); // Should be very recent
        });
    });
});
