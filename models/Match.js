const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    matchId: { type: String, required: true, unique: true },
    players: { type: [String], required: true },
    round: { type: Number, default: 1 },
    waitingFor: { type: [String], default: [] },
    cardsPlayed: { type: Object, default: {} },
    cardHashes: { type: Object, default: {} },
    damageInflicted: { type: Object, default: {} },
    rewards: { type: Object, default: {} },
    playerStats: {
        type: Map,
        of: new mongoose.Schema({
            energy: { type: Number, default: 8 },
            baseHealth: { type: Number, default: 15 }
        })
    },
    battleHistory: { type: Map, of: [Object], default: {} },
    remainingCards: { type: Map, of: [Object], default: {} },
    status: { type: String, default: 'active' },
    winner: { type: String },
    manaWagered: { type: Number, default: 0 },
    totalManaPool: { type: Number, default: 0 },
    playerManaWagered: {
        type: Map,
        of: Number,
        default: {}
    },
    rank: { type: String, default: 'rookie 1' }
});

module.exports = mongoose.model('Match', matchSchema);
