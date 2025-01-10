const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    matchId: { type: String, required: true, unique: true },
    players: { type: [String], required: true },
    deckHashes: { type: Map, of: String },
    decks: {
        type: Object,
        default: {}
    },
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
    retWagered: { type: Number, default: 0 },
    totalManaPool: { type: Number, default: 0 },
    playerManaWagered: {
        type: Map,
        of: Number,
        default: {}
    },
    playerRetWagered: {
        type: Map,
        of: Number,
        default: {}
    },
    rank: {
        type: String,
        default: 'rookie1',
        set: function(v) {
            return v.toLowerCase().replace(/\s+/g, '');
        }
    },
    type: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Match', matchSchema);
