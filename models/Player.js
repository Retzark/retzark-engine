const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    rank: { type: String, default: 'rookie 1' },
    xp: { type: Number, default: 0 },
    manaBalance: { type: Number, default: 100 },
    matches: { type: [String], default: [] },
    wins: { type: Number, default: 0 },
});

module.exports = mongoose.model('Player', playerSchema);
