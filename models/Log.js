const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    matchId: { type: String, required: true },
    events: { type: Array, default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema);
