const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Match = require('../models/Match');
const Player = require('../models/Player');
const Wager = require('../models/Wager');
const { joinWaitingRoom, matchPlayersByRank, waitingPlayers } = require('../services/matchmakingService');
const { getTx, postTransaction } = require('../services/hiveService');

// Mock hiveService
jest.mock('../services/hiveService', () => ({
    getTx: jest.fn(),
    postTransaction: jest.fn().mockResolvedValue({ id: 'mock-tx-id' })
}));

// Mock manaService
jest.mock('../services/manaService', () => ({
    determineBuyIn: jest.fn().mockResolvedValue(1000),
    getMaxBetForRank: jest.fn().mockReturnValue(2000)
}));

// Mock transaction response
const mockTransaction = (matchType = 'ranked') => ({
    operations: [{
        1: {
            id: 'RZ_JOIN_WAITING_ROOM',
            required_posting_auths: ['player1'],
            json: JSON.stringify({
                matchType,
                deckHash: 'hash123'
            })
        }
    }]
});

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
    await Wager.deleteMany({});
    waitingPlayers.clear();
});

describe('Matchmaking Service', () => {
    describe('handleJoinRequest', () => {
        it('should add player to waiting room with ranked match type', async () => {
            // Mock successful transaction response
            getTx.mockResolvedValue(mockTransaction('ranked'));
            const player = 'player1';
            const txData = {
                operations: [{
                    1: {
                        id: 'RZ_JOIN_WAITING_ROOM',
                        required_posting_auths: [player],
                        json: JSON.stringify({
                            matchType: 'ranked',
                            deckHash: 'hash123'
                        })
                    }
                }]
            };

            await joinWaitingRoom('tx123', player);
            
            const waitingPlayersArray = Array.from(waitingPlayers);
            expect(waitingPlayersArray).toHaveLength(1);
            
            const playerInfo = JSON.parse(waitingPlayersArray[0]);
            expect(playerInfo.username).toBe(player);
            expect(playerInfo.matchType).toBe('ranked');
        });

        it('should add player to waiting room with wagered match type', async () => {
            // Mock successful transaction response
            getTx.mockResolvedValue(mockTransaction('wagered'));
            const player = 'player1';
            const txData = {
                operations: [{
                    1: {
                        id: 'RZ_JOIN_WAITING_ROOM',
                        required_posting_auths: [player],
                        json: JSON.stringify({
                            matchType: 'wagered',
                            deckHash: 'hash123'
                        })
                    }
                }]
            };

            await joinWaitingRoom('tx123', player);
            
            const waitingPlayersArray = Array.from(waitingPlayers);
            expect(waitingPlayersArray).toHaveLength(1);
            
            const playerInfo = JSON.parse(waitingPlayersArray[0]);
            expect(playerInfo.username).toBe(player);
            expect(playerInfo.matchType).toBe('wagered');
        });

        it('should default to ranked match type if not specified', async () => {
            // Mock transaction without matchType
            getTx.mockResolvedValue({
                operations: [{
                    1: {
                        id: 'RZ_JOIN_WAITING_ROOM',
                        required_posting_auths: ['player1'],
                        json: JSON.stringify({
                            deckHash: 'hash123'
                        })
                    }
                }]
            });
            const player = 'player1';
            const txData = {
                operations: [{
                    1: {
                        id: 'RZ_JOIN_WAITING_ROOM',
                        required_posting_auths: [player],
                        json: JSON.stringify({
                            deckHash: 'hash123'
                        })
                    }
                }]
            };

            await joinWaitingRoom('tx123', player);
            
            const waitingPlayersArray = Array.from(waitingPlayers);
            expect(waitingPlayersArray).toHaveLength(1);
            
            const playerInfo = JSON.parse(waitingPlayersArray[0]);
            expect(playerInfo.username).toBe(player);
            expect(playerInfo.matchType).toBe('ranked');
        });
    });

    describe('matchPlayersByRank', () => {
        it('should match players with same match type', async () => {
            // Create two players with same rank and match type
            const player1 = await Player.create({
                username: 'player1',
                rank: 'rookie1',
                xp: 100,
                manaBalance: 1000
            });

            const player2 = await Player.create({
                username: 'player2',
                rank: 'rookie1',
                xp: 150,
                manaBalance: 1000
            });

            // Add both players to waiting room with same match type
            waitingPlayers.add(JSON.stringify({
                username: 'player1',
                matchType: 'ranked'
            }));

            waitingPlayers.add(JSON.stringify({
                username: 'player2',
                matchType: 'ranked'
            }));

            await matchPlayersByRank();

            // Check if a match was created
            const match = await Match.findOne({
                players: { $all: ['player1', 'player2'] }
            });

            expect(match).toBeDefined();
            expect(match.type).toBe('ranked');
            
            // Verify MANA wager was created for ranked match
            const wager = await Wager.findOne({ matchId: match.matchId });
            expect(wager).toBeDefined();
            expect(wager.wagerType).toBe('mana');
        });

        it('should not match players with different match types', async () => {
            // Create two players with same rank but different match types
            const player1 = await Player.create({
                username: 'player1',
                rank: 'rookie1',
                xp: 100,
                manaBalance: 1000
            });

            const player2 = await Player.create({
                username: 'player2',
                rank: 'rookie1',
                xp: 150,
                manaBalance: 1000
            });

            // Add players to waiting room with different match types
            waitingPlayers.add(JSON.stringify({
                username: 'player1',
                matchType: 'ranked'
            }));

            waitingPlayers.add(JSON.stringify({
                username: 'player2',
                matchType: 'wagered'
            }));

            await matchPlayersByRank();

            // Check that no match was created
            const match = await Match.findOne({
                players: { $all: ['player1', 'player2'] }
            });

            expect(match).toBeNull();
        });

        it('should create RET wager for wagered match type', async () => {
            // Create two players for wagered match
            const player1 = await Player.create({
                username: 'player1',
                rank: 'rookie1',
                xp: 100,
                retBalance: 2000,
                manaBalance: 0
            });

            const player2 = await Player.create({
                username: 'player2',
                rank: 'rookie1',
                xp: 150,
                retBalance: 2000,
                manaBalance: 0
            });

            // Add both players to waiting room with wagered match type
            waitingPlayers.add(JSON.stringify({
                username: 'player1',
                matchType: 'wagered'
            }));

            waitingPlayers.add(JSON.stringify({
                username: 'player2',
                matchType: 'wagered'
            }));

            await matchPlayersByRank();

            // Check if match was created
            const match = await Match.findOne({
                players: { $all: ['player1', 'player2'] }
            });

            expect(match).toBeDefined();
            expect(match.type).toBe('wagered');

            // Verify RET wager was created
            const wager = await Wager.findOne({ matchId: match.matchId });
            expect(wager).toBeDefined();
            expect(wager.player1).toBe('player1');
            expect(wager.player2).toBe('player2');
            expect(wager.wagerType).toBe('ret');
        });

        it('should create MANA wager for ranked match type', async () => {
            // Create two players for ranked match
            const player1 = await Player.create({
                username: 'player1',
                rank: 'rookie1',
                xp: 100,
                retBalance: 0,
                manaBalance: 2000
            });

            const player2 = await Player.create({
                username: 'player2',
                rank: 'rookie1',
                xp: 150,
                retBalance: 0,
                manaBalance: 2000
            });

            // Add both players to waiting room with ranked match type
            waitingPlayers.add(JSON.stringify({
                username: 'player1',
                matchType: 'ranked'
            }));

            waitingPlayers.add(JSON.stringify({
                username: 'player2',
                matchType: 'ranked'
            }));

            await matchPlayersByRank();

            // Check if match was created
            const match = await Match.findOne({
                players: { $all: ['player1', 'player2'] }
            });

            expect(match).toBeDefined();
            expect(match.type).toBe('ranked');

            // Verify MANA wager was created
            const wager = await Wager.findOne({ matchId: match.matchId });
            expect(wager).toBeDefined();
            expect(wager.player1).toBe('player1');
            expect(wager.player2).toBe('player2');
            expect(wager.wagerType).toBe('mana');
        });

        it('should check RET balance for wagered matches', async () => {
            // Create two players, one with insufficient RET
            const player1 = await Player.create({
                username: 'player1',
                rank: 'rookie1',
                xp: 100,
                retBalance: 0, // Insufficient RET
                manaBalance: 1000
            });

            const player2 = await Player.create({
                username: 'player2',
                rank: 'rookie1',
                xp: 150,
                retBalance: 2000,
                manaBalance: 1000
            });

            // Add both players to waiting room with wagered match type
            waitingPlayers.add(JSON.stringify({
                username: 'player1',
                matchType: 'wagered'
            }));

            waitingPlayers.add(JSON.stringify({
                username: 'player2',
                matchType: 'wagered'
            }));

            await matchPlayersByRank();

            // Check that no match was created
            const match = await Match.findOne({
                players: { $all: ['player1', 'player2'] }
            });

            expect(match).toBeNull();

            // Verify player1 was removed from waiting room
            const waitingPlayersArray = Array.from(waitingPlayers);
            const remainingPlayers = waitingPlayersArray.map(p => JSON.parse(p).username);
            expect(remainingPlayers).not.toContain('player1');
        });

        it('should check MANA balance for ranked matches', async () => {
            // Create two players, one with insufficient MANA
            const player1 = await Player.create({
                username: 'player1',
                rank: 'rookie1',
                xp: 100,
                retBalance: 1000,
                manaBalance: 0 // Insufficient MANA
            });

            const player2 = await Player.create({
                username: 'player2',
                rank: 'rookie1',
                xp: 150,
                retBalance: 1000,
                manaBalance: 2000
            });

            // Add both players to waiting room with ranked match type
            waitingPlayers.add(JSON.stringify({
                username: 'player1',
                matchType: 'ranked'
            }));

            waitingPlayers.add(JSON.stringify({
                username: 'player2',
                matchType: 'ranked'
            }));

            await matchPlayersByRank();

            // Check that no match was created
            const match = await Match.findOne({
                players: { $all: ['player1', 'player2'] }
            });

            expect(match).toBeNull();

            // Verify player1 was removed from waiting room
            const waitingPlayersArray = Array.from(waitingPlayers);
            const remainingPlayers = waitingPlayersArray.map(p => JSON.parse(p).username);
            expect(remainingPlayers).not.toContain('player1');
        });
    });
});
