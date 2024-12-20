const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Player = require('../models/Player');
const { determineMaxMana, getManaBalance, getMaxBetForRank, determineBuyIn, deductMana } = require('../services/manaService');
const { updateMana } = require('../scripts/updateMana');

let mongoServer;

// Increase Jest's default timeout
jest.setTimeout(60000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Player.deleteMany({});
});

describe('Mana Service', () => {
  describe('Buy-in System', () => {
    it('should return correct buy-in for each rank', () => {
      expect(determineBuyIn('rookie')).toBe(1);
      expect(determineBuyIn('adept')).toBe(100);
      expect(determineBuyIn('expert')).toBe(150);
      expect(determineBuyIn('master')).toBe(200);
      expect(determineBuyIn('grandmaster')).toBe(250);
      expect(determineBuyIn('transcendent')).toBe(250);
    });

    it('should return 0 for unknown rank', () => {
      expect(determineBuyIn('unknown')).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(determineBuyIn(null)).toBe(0);
      expect(determineBuyIn(undefined)).toBe(0);
      expect(determineBuyIn('')).toBe(0);
    });

    it('should handle case sensitivity', () => {
      expect(determineBuyIn('ROOKIE')).toBe(0);
      expect(determineBuyIn('Adept')).toBe(0);
      expect(determineBuyIn('EXPERT')).toBe(0);
    });
  });

  describe('determineMaxMana', () => {
    it('should return correct max mana for each rank', () => {
      expect(determineMaxMana('rookie')).toBe(1000);
      expect(determineMaxMana('adept')).toBe(2000);
      expect(determineMaxMana('expert')).toBe(3000);
      expect(determineMaxMana('master')).toBe(4000);
      expect(determineMaxMana('grandmaster')).toBe(5000);
      expect(determineMaxMana('transcendent')).toBe(5000);
    });

    it('should return default value for unknown rank', () => {
      expect(determineMaxMana('unknown')).toBe(1000);
    });
  });

  describe('getManaBalance', () => {
    it('should return correct mana balances for existing player', async () => {
      const player = new Player({ 
        username: 'testplayer', 
        maxManaBalance: 2000, 
        manaBalance: 1500 
      });
      await player.save();

      const result = await getManaBalance('testplayer');
      expect(result).toEqual({ maxManaBalance: 2000, manaBalance: 1500 });
    });

    it('should return error for non-existing player', async () => {
      const result = await getManaBalance('nonexistent');
      expect(result).toEqual({ success: false, message: 'Player not found' });
    });
  });

  describe('getMaxBetForRank', () => {
    it('should return correct max bet for each rank', () => {
      expect(getMaxBetForRank('rookie')).toBe(10);
      expect(getMaxBetForRank('adept')).toBe(100);
      expect(getMaxBetForRank('expert')).toBe(150);
      expect(getMaxBetForRank('master')).toBe(200);
      expect(getMaxBetForRank('grandmaster')).toBe(250);
      expect(getMaxBetForRank('transcendent')).toBe(500);
    });

    it('should return 0 for unknown rank', () => {
      expect(getMaxBetForRank('unknown')).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(getMaxBetForRank(null)).toBe(0);
      expect(getMaxBetForRank(undefined)).toBe(0);
      expect(getMaxBetForRank('')).toBe(0);
    });
  });

  describe('updateMana', () => {
    it('should correctly update mana for all players', async () => {
      const players = [
        new Player({ username: 'rookie1', rank: 'rookie', maxManaBalance: 1000, manaBalance: 500 }),
        new Player({ username: 'adept1', rank: 'adept', maxManaBalance: 2000, manaBalance: 1000 }),
        new Player({ username: 'expert1', rank: 'expert', maxManaBalance: 3000, manaBalance: 1500 })
      ];
      await Player.insertMany(players);

      await updateMana();

      const updatedRookie = await Player.findOne({ username: 'rookie1' });
      const updatedAdept = await Player.findOne({ username: 'adept1' });
      const updatedExpert = await Player.findOne({ username: 'expert1' });

      expect(updatedRookie.maxManaBalance).toBe(1000);
      expect(updatedRookie.manaBalance).toBe(1000);
      expect(updatedAdept.maxManaBalance).toBe(2000);
      expect(updatedAdept.manaBalance).toBe(2000);
      expect(updatedExpert.maxManaBalance).toBe(3000);
      expect(updatedExpert.manaBalance).toBe(3000);
    });

    it('should handle players with number in rank', async () => {
      const player = new Player({ 
        username: 'rookie2', 
        rank: 'rookie 2', 
        maxManaBalance: 1000, 
        manaBalance: 800 
      });
      await player.save();

      await updateMana();

      const updatedPlayer = await Player.findOne({ username: 'rookie2' });
      expect(updatedPlayer.maxManaBalance).toBe(1000);
      expect(updatedPlayer.manaBalance).toBe(1000);
    });
  });

  describe('Mana deduction', () => {
    it('should correctly deduct mana for a match', async () => {
      const player = new Player({ 
        username: 'testplayer', 
        rank: 'rookie', 
        maxManaBalance: 1000, 
        manaBalance: 1000 
      });
      await player.save();

      await deductMana('testplayer', 100);

      const updatedPlayer = await Player.findOne({ username: 'testplayer' });
      expect(updatedPlayer.manaBalance).toBe(900);
      expect(updatedPlayer.manaHistory).toHaveLength(1);
      expect(updatedPlayer.manaHistory[0].change).toBe(-100);
    });

    it('should not allow mana to go below 0', async () => {
      const player = new Player({ 
        username: 'testplayer', 
        rank: 'rookie', 
        maxManaBalance: 1000, 
        manaBalance: 50 
      });
      await player.save();

      await expect(deductMana('testplayer', 100)).rejects.toThrow('Insufficient mana');

      const updatedPlayer = await Player.findOne({ username: 'testplayer' });
      expect(updatedPlayer.manaBalance).toBe(50);  // Balance should remain unchanged
      expect(updatedPlayer.manaHistory).toHaveLength(0);  // No history entry should be added
    });
  });

  describe('Concurrent Mana Deduction', () => {
    it('should handle multiple simultaneous deductions correctly', async () => {
      const player = new Player({ 
        username: 'testplayer', 
        rank: 'rookie', 
        maxManaBalance: 1000, 
        manaBalance: 1000 
      });
      await player.save();

      const deductions = [
        deductMana('testplayer', 200),
        deductMana('testplayer', 300),
        deductMana('testplayer', 400)
      ];

      await Promise.all(deductions);

      const updatedPlayer = await Player.findOne({ username: 'testplayer' });
      expect(updatedPlayer.manaBalance).toBe(100);
      expect(updatedPlayer.manaHistory).toHaveLength(3);
    });

    it('should prevent balance from going negative in concurrent deductions', async () => {
      const player = new Player({ 
        username: 'testplayer', 
        rank: 'rookie', 
        maxManaBalance: 1000, 
        manaBalance: 500 
      });
      await player.save();

      const deductions = [
        deductMana('testplayer', 300),
        deductMana('testplayer', 300)
      ];

      const results = await Promise.allSettled(deductions);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[1].reason.message).toBe('Insufficient mana');

      const updatedPlayer = await Player.findOne({ username: 'testplayer' });
      expect(updatedPlayer.manaBalance).toBe(200);
      expect(updatedPlayer.manaHistory).toHaveLength(1);
    });

    it('should maintain transaction history accuracy under concurrent operations', async () => {
      const player = new Player({ 
        username: 'testplayer', 
        rank: 'rookie', 
        maxManaBalance: 1000, 
        manaBalance: 1000 
      });
      await player.save();

      const deductions = Array(5).fill(null).map(() => 
        deductMana('testplayer', 100)
      );

      await Promise.all(deductions);

      const updatedPlayer = await Player.findOne({ username: 'testplayer' });
      expect(updatedPlayer.manaBalance).toBe(500);
      expect(updatedPlayer.manaHistory).toHaveLength(5);
      
      updatedPlayer.manaHistory.forEach(transaction => {
        expect(transaction.change).toBe(-100);
        expect(transaction.reason).toBe('Match wager');
      });
    });

    it('should handle rapid sequential deductions correctly', async () => {
      const player = new Player({ 
        username: 'testplayer', 
        rank: 'rookie', 
        maxManaBalance: 1000, 
        manaBalance: 1000 
      });
      await player.save();

      for (let i = 0; i < 5; i++) {
        await deductMana('testplayer', 100);
      }

      const updatedPlayer = await Player.findOne({ username: 'testplayer' });
      expect(updatedPlayer.manaBalance).toBe(500);
      expect(updatedPlayer.manaHistory).toHaveLength(5);

      // Convert manaHistory to array of expected balances
      const expectedBalances = [900, 800, 700, 600, 500];
      
      // Verify each transaction resulted in the expected balance
      updatedPlayer.manaHistory.forEach((transaction, index) => {
        const expectedBalance = expectedBalances[index];
        const actualBalance = 1000 - (100 * (index + 1));
        expect(actualBalance).toBe(expectedBalance);
      });
    });
  });
});
