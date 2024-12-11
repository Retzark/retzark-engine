const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Match = require('../models/Match');
const Player = require('../models/Player');
const RetReward = require('../models/RetReward');
const Card = require('../models/Card');
const { calculateMatchOutcome } = require('../services/gameLogicService');

let mongoServer;
let testCards;

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
    await Card.deleteMany({});

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

    // Create test cards with all required fields
    testCards = await Card.create([
        { 
            id: 1, 
            name: 'Test Card 1', 
            atk: 5, 
            hp: 5, 
            egy: 2,
            spd: 3,
            rarity: 'common'
        },
        { 
            id: 2, 
            name: 'Test Card 2', 
            atk: 3, 
            hp: 7, 
            egy: 2,
            spd: 2,
            rarity: 'common'
        },
        { 
            id: 3, 
            name: 'Test Card 3', 
            atk: 7, 
            hp: 3, 
            egy: 2,
            spd: 4,
            rarity: 'common'
        }
    ]);
});

describe('Game Logic Service', () => {
    describe('calculateMatchOutcome', () => {
        it('should properly resolve a match when a winner is determined', async () => {
            // Create players
            const player1 = await Player.create({
                username: 'player1',
                rank: 'rookie1',
                xp: 0,
                retBalance: 0
            });

            const player2 = await Player.create({
                username: 'player2',
                rank: 'rookie1',
                xp: 0,
                retBalance: 0
            });

            // Create match
            const match = await Match.create({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'active',
                rank: 'rookie1',
                round: 7, // Final round
                cardsPlayed: {
                    7: {
                        player1: [1, 2], // Card IDs
                        player2: [3]
                    }
                },
                playerStats: new Map([
                    ['player1', { energy: 8, baseHealth: 15 }],
                    ['player2', { energy: 8, baseHealth: 3 }] // Low health
                ]),
                totalManaPool: 100,
                battleHistory: new Map(),
                remainingCards: new Map([
                    ['6', [{
                        player1: [
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 },
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 },
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 }
                        ],
                        player2: [
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 },
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 },
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 }
                        ]
                    }]]
                ])
            });

            // Calculate match outcome
            await calculateMatchOutcome(match.matchId);

            // Verify match was resolved
            const updatedMatch = await Match.findOne({ matchId: match.matchId });
            expect(updatedMatch.status).toBe('completed');
            expect(updatedMatch.winner).toBeDefined();

            // Verify rewards were credited
            expect(updatedMatch.rewards).toBeDefined();
            expect(updatedMatch.rewards.retAmount).toBeDefined();
            expect(updatedMatch.rewards.retCredited).toBe(true);

            // Verify winner received RET tokens
            const winner = await Player.findOne({ username: updatedMatch.winner });
            expect(winner.retBalance).toBeGreaterThan(0);
            expect(winner.retHistory).toHaveLength(1);
            expect(winner.retHistory[0].matchId).toBe(match.matchId);
        });

        it('should not resolve match if no winner is determined', async () => {
            // Create players
            const player1 = await Player.create({
                username: 'player1',
                rank: 'rookie1',
                xp: 0,
                retBalance: 0
            });

            const player2 = await Player.create({
                username: 'player2',
                rank: 'rookie1',
                xp: 0,
                retBalance: 0
            });

            // Create match (not final round)
            const match = await Match.create({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'active',
                rank: 'rookie1',
                round: 3, // Not final round
                cardsPlayed: {
                    3: {
                        player1: [1, 2],
                        player2: [3]
                    }
                },
                playerStats: new Map([
                    ['player1', { energy: 8, baseHealth: 15 }],
                    ['player2', { energy: 8, baseHealth: 15 }]
                ]),
                totalManaPool: 100,
                battleHistory: new Map(),
                remainingCards: new Map([
                    ['2', [{
                        player1: [
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 },
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 },
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 }
                        ],
                        player2: [
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 },
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 },
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 }
                        ]
                    }]]
                ])
            });

            // Calculate match outcome
            await calculateMatchOutcome(match.matchId);

            // Verify match continues
            const updatedMatch = await Match.findOne({ matchId: match.matchId });
            expect(updatedMatch.status).toBe('active');
            expect(updatedMatch.winner).toBeUndefined();
            expect(updatedMatch.rewards).toEqual({});  // Match schema defines default as {}

            // Verify no RET tokens were credited
            const player1After = await Player.findOne({ username: 'player1' });
            const player2After = await Player.findOne({ username: 'player2' });
            expect(player1After.retBalance).toBe(0);
            expect(player2After.retBalance).toBe(0);
        });

        it('should properly handle match resolution at round 7', async () => {
            // Create players
            const player1 = await Player.create({
                username: 'player1',
                rank: 'rookie1',
                xp: 0,
                retBalance: 0
            });

            const player2 = await Player.create({
                username: 'player2',
                rank: 'rookie1',
                xp: 0,
                retBalance: 0
            });

            // Create match at final round
            const match = await Match.create({
                matchId: 'test-match-1',
                players: ['player1', 'player2'],
                status: 'active',
                rank: 'rookie1',
                round: 7,
                cardsPlayed: {
                    7: {
                        player1: [1, 2],
                        player2: [3]
                    }
                },
                playerStats: new Map([
                    ['player1', { energy: 8, baseHealth: 15 }],
                    ['player2', { energy: 8, baseHealth: 15 }]
                ]),
                totalManaPool: 100,
                battleHistory: new Map(),
                remainingCards: new Map([
                    ['6', [{
                        player1: [
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 },
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 },
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 }
                        ],
                        player2: [
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 },
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 },
                            { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 }
                        ]
                    }]]
                ])
            });

            // Calculate match outcome
            await calculateMatchOutcome(match.matchId);

            // Verify match was resolved
            const updatedMatch = await Match.findOne({ matchId: match.matchId });
            expect(updatedMatch.status).toBe('completed');
            expect(updatedMatch.winner).toBeDefined();
            expect(updatedMatch.rewards).toBeDefined();
            expect(updatedMatch.rewards.retAmount).toBeDefined();
            expect(updatedMatch.rewards.retCredited).toBe(true);

            // Verify winner received RET tokens
            const winner = await Player.findOne({ username: updatedMatch.winner });
            expect(winner.retBalance).toBeGreaterThan(0);
            expect(winner.retHistory).toHaveLength(1);
            expect(winner.retHistory[0].matchId).toBe(match.matchId);
        });
    });
});
