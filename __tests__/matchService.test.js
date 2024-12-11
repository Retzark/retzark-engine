const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Match = require('../models/Match');
const Player = require('../models/Player');
const RetReward = require('../models/RetReward');
const {
    getMatchDetails,
    revealCards,
    resolveMatch,
    surrenderMatch,
    submitDeck
} = require('../services/matchService');

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

    // Create test RetReward configuration
    await RetReward.create({
        rewards: {
            'rookie1': 14.784372086975955,
            'rookie2': 29.56874417395191,
            'rookie3': 44.80112753629077,
            'adept1': 59.585499623266735,
            'adept2': 74.36987171024268,
            'adept3': 89.60225507258154,
            'expert1': 104.3866271595575,
            'expert2': 119.17099924653347,
            'expert3': 134.40338260887233,
            'master1': 149.18775469584827,
            'master2': 163.97212678282423,
            'master3': 179.20451014516308,
            'grandmaster1': 193.98888223213905,
            'grandmaster2': 208.773254319115,
            'grandmaster3': 224.0056376814539,
            'champion1': 238.7900097684298,
            'champion2': 253.57438185540576,
            'champion3': 268.80676521774467,
            'legend1': 283.59113730472063,
            'legend2': 298.37550939169654,
            'legend3': 313.6078927540354,
            'myth1': 328.39226484101135,
            'myth2': 343.17663692798726,
            'myth3': 358.40902029032617,
            'transcendent': 448.0112753629078
        }
    });
});

describe('Match Service', () => {
    describe('getMatchDetails', () => {
        it('should return match details for valid match ID', async () => {
            const match = new Match({
                matchId: 'test-match-1',
                players: ['player1', 'player2']
            });
            await match.save();

            const result = await getMatchDetails('test-match-1');
            expect(result).toBeDefined();
            expect(result.matchId).toBe('test-match-1');
        });

        it('should return null for non-existent match', async () => {
            const result = await getMatchDetails('non-existent-match');
            expect(result).toBeNull();
        });
    });

    describe('revealCards', () => {
        it('should successfully reveal cards when hash matches', async () => {
            const match = new Match({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'active',
                cardHashes: {
                    1: {
                        player1: '297335b473cf0540a39266959281bd1d77ad87c5ced4903a2024f35d0d83cf6f',
                        player2: '456hash'
                    }
                }
            });
            await match.save();

            const result = await revealCards('test-match-1', 'player1', ['card1', 'card2']);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Cards revealed and verified');
        });

        it('should fail when match is not active', async () => {
            const match = new Match({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'completed'
            });
            await match.save();

            const result = await revealCards('test-match-1', 'player1', ['card1', 'card2']);
            expect(result.success).toBe(false);
            expect(result.message).toBe('Match is not active');
        });

        it('should fail when card hash verification fails', async () => {
            const match = new Match({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'active',
                cardHashes: {
                    1: {
                        player1: '123hash',
                        player2: '456hash'
                    }
                }
            });
            await match.save();

            const result = await revealCards('test-match-1', 'player1', ['card3', 'card4']);
            expect(result.success).toBe(false);
            expect(result.message).toBe('Card verification failed');
        });
    });

    describe('resolveMatch', () => {
        it('should successfully resolve a match', async () => {
            const match = new Match({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'active',
                rank: 'rookie1'
            });
            await match.save();

            const player = new Player({
                username: 'player1',
                rank: 'rookie1'
            });
            await player.save();

            const result = await resolveMatch('test-match-1', 'player1', 'player2', false, 100);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Match resolved successfully');
            expect(result.retAwarded).toBeDefined();

            const updatedMatch = await Match.findOne({ matchId: 'test-match-1' });
            expect(updatedMatch.status).toBe('completed');
            expect(updatedMatch.winner).toBe('player1');

            const updatedPlayer = await Player.findOne({ username: 'player1' });
            expect(updatedPlayer.retBalance).toBeGreaterThan(0);
            expect(updatedPlayer.retHistory).toHaveLength(1);
        });

        it('should handle non-existent match', async () => {
            await expect(resolveMatch('non-existent-match', 'player1', 'player2', false, 0))
                .rejects.toThrow('Match not found');
        });

        it('should update ranks for ranked matches', async () => {
            const match = new Match({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'active',
                rank: 'rookie1'
            });
            await match.save();

            const winner = new Player({
                username: 'player1',
                rank: 'rookie1',
                xp: 0
            });
            await winner.save();

            const loser = new Player({
                username: 'player2',
                rank: 'rookie1',
                xp: 0
            });
            await loser.save();

            const result = await resolveMatch('test-match-1', 'player1', 'player2', true, 100);
            expect(result.success).toBe(true);
            expect(result.retAwarded).toBeDefined();

            const updatedWinner = await Player.findOne({ username: 'player1' });
            expect(updatedWinner.xp).toBeGreaterThan(0);
        });
    });

    describe('surrenderMatch', () => {
        it('should successfully surrender a match', async () => {
            const match = new Match({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'active',
                rank: 'rookie1'
            });
            await match.save();

            const player = new Player({
                username: 'player2',
                rank: 'rookie1'
            });
            await player.save();

            const result = await surrenderMatch('test-match-1', 'player1');
            expect(result.success).toBe(true);
            expect(result.message).toBe('Match surrendered successfully');

            const updatedMatch = await Match.findOne({ matchId: 'test-match-1' });
            expect(updatedMatch.status).toBe('completed');
            expect(updatedMatch.winner).toBe('player2');
        });

        it('should fail for non-existent match', async () => {
            const result = await surrenderMatch('non-existent-match', 'player1');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Match not found');
        });

        it('should fail for inactive match', async () => {
            const match = new Match({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'completed'
            });
            await match.save();

            const result = await surrenderMatch('test-match-1', 'player1');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Match is not active');
        });

        it('should fail for non-participant player', async () => {
            const match = new Match({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'active'
            });
            await match.save();

            const result = await surrenderMatch('test-match-1', 'player3');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Player not found in match');
        });
    });

    describe('submitDeck', () => {
        it('should successfully submit deck', async () => {
            const match = new Match({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'active'
            });
            await match.save();

            const result = await submitDeck('test-match-1', 'player1', 'deck-hash-123', ['hash1']);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Deck submitted successfully');

            const updatedMatch = await Match.findOne({ matchId: 'test-match-1' });
            expect(updatedMatch.decks).toBeDefined();
            expect(updatedMatch.decks.player1).toBeDefined();
            expect(updatedMatch.decks.player1.deckHash).toBe('deck-hash-123');
        });

        it('should update match status when both players submit decks', async () => {
            const match = new Match({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'active'
            });
            await match.save();

            await submitDeck('test-match-1', 'player1', 'deck-hash-1', ['hash1']);
            const result = await submitDeck('test-match-1', 'player2', 'deck-hash-2', ['hash2']);

            expect(result.status).toBe('decks_submitted');

            const updatedMatch = await Match.findOne({ matchId: 'test-match-1' });
            expect(updatedMatch.status).toBe('decks_submitted');
        });

        it('should fail for non-existent match', async () => {
            await expect(submitDeck('non-existent-match', 'player1', 'hash', []))
                .rejects.toThrow('Match not found');
        });

        it('should fail for non-participant player', async () => {
            const match = new Match({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'active'
            });
            await match.save();

            await expect(submitDeck('test-match-1', 'player3', 'hash', []))
                .rejects.toThrow('Player not in this match');
        });
    });
});
