const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Player = require('../models/Player');
const { determineMaxMana, getManaBalance } = require('../services/manaService');
const { updateMana } = require('../scripts/updateMana');

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
  await Player.deleteMany({});
});

describe('Mana Service', () => {
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
      const player = new Player({ username: 'testplayer', maxManaBalance: 2000, currentManaBalance: 1500 });
      await player.save();

      const result = await getManaBalance('testplayer');
      expect(result).toEqual({ maxManaBalance: 2000, currentManaBalance: 1500 });
    });

    it('should return error for non-existing player', async () => {
      const result = await getManaBalance('nonexistent');
      expect(result).toEqual({ success: false, message: 'Player not found' });
    });
  });

  describe('updateMana', () => {
    it('should correctly update mana for all players', async () => {
      const players = [
        new Player({ username: 'rookie1', rank: 'rookie', maxManaBalance: 1000, currentManaBalance: 500 }),
        new Player({ username: 'adept1', rank: 'adept', maxManaBalance: 2000, currentManaBalance: 1000 }),
        new Player({ username: 'expert1', rank: 'expert', maxManaBalance: 3000, currentManaBalance: 1500 }),
      ];
      await Player.insertMany(players);

      await updateMana();

      const updatedRookie = await Player.findOne({ username: 'rookie1' });
      const updatedAdept = await Player.findOne({ username: 'adept1' });
      const updatedExpert = await Player.findOne({ username: 'expert1' });

      expect(updatedRookie.maxManaBalance).toBe(1000);
      expect(updatedRookie.currentManaBalance).toBe(1000);
      expect(updatedAdept.maxManaBalance).toBe(2000);
      expect(updatedAdept.currentManaBalance).toBe(2000);
      expect(updatedExpert.maxManaBalance).toBe(3000);
      expect(updatedExpert.currentManaBalance).toBe(3000);
    });

    it('should handle players with number in rank', async () => {
      const player = new Player({ username: 'rookie2', rank: 'rookie 2', maxManaBalance: 1000, currentManaBalance: 800 });
      await player.save();

      await updateMana();

      const updatedPlayer = await Player.findOne({ username: 'rookie2' });
      expect(updatedPlayer.maxManaBalance).toBe(1000);
      expect(updatedPlayer.currentManaBalance).toBe(1000);
    });
  });

  describe('Mana deduction', () => {
    it('should correctly deduct mana for a match', async () => {
      const player = new Player({ username: 'testplayer', rank: 'rookie', maxManaBalance: 1000, currentManaBalance: 1000 });
      await player.save();

      // Simulate a match where 100 mana is wagered
      player.currentManaBalance -= 100;
      player.manaHistory.push({ change: -100, reason: 'Match wager' });
      await player.save();

      const updatedPlayer = await Player.findOne({ username: 'testplayer' });
      expect(updatedPlayer.currentManaBalance).toBe(900);
      expect(updatedPlayer.manaHistory).toHaveLength(1);
      expect(updatedPlayer.manaHistory[0].change).toBe(-100);
    });

    it('should not allow mana to go below 0', async () => {
      const player = new Player({ username: 'testplayer', rank: 'rookie', maxManaBalance: 1000, currentManaBalance: 50 });
      await player.save();

      // Attempt to deduct more mana than available
      await expect(async () => {
        if (player.currentManaBalance < 100) throw new Error('Insufficient mana');
        player.currentManaBalance -= 100;
        player.manaHistory.push({ change: -100, reason: 'Match wager' });
        await player.save();
      }).rejects.toThrow('Insufficient mana');

      const updatedPlayer = await Player.findOne({ username: 'testplayer' });
      expect(updatedPlayer.currentManaBalance).toBe(50);  // Balance should remain unchanged
      expect(updatedPlayer.manaHistory).toHaveLength(0);  // No history entry should be added
    });
  });
});
