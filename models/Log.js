const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    matchId: { type: String, required: true },
    events: { type: Array, default: [] }
});

module.exports = mongoose.model('Log', logSchema);
