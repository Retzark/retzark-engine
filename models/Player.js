const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    rank: { type: String, default: 'rookie 1' },
    xp: { type: Number, default: 0 },
    maxManaBalance: { type: Number, default: 1000 },
    currentManaBalance: { type: Number, default: 1000 },
    retBalance: { type: Number, default: 0 },
    matches: { type: [String], default: [] },
    wins: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    manaHistory: [{
        date: { type: Date, default: Date.now },
        change: Number,
        reason: String
    }],
    retHistory: [{
        date: { type: Date, default: Date.now },
        change: Number,
        matchId: String,
        reason: String
    }]
});

module.exports = mongoose.model('Player', playerSchema);
