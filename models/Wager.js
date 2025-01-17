const mongoose = require('mongoose');

const wagerSchema = new mongoose.Schema({
    matchId: { type: String, required: true },
    player1: { type: String, required: true },
    player2: { type: String, required: true },
    player1Wager: { type: Number, required: true },
    player2Wager: { type: Number, required: true },
    maxWager: { type: Number, required: true },
    wagerType: { type: String, enum: ['mana', 'ret'], required: true },
    playerStats: {
        type: Map,
        of: new mongoose.Schema({
            status: { type: String, default: 'pending' },
        })
    },
    betTransactions: {
        type: [{
            transactionId: String,
            status: String,
            amount: Number,
            betType: String,
            round: Number
        }],
        default: []
    },
    totalPool: { type: Number, required: true },
    winner: { type: String },
    status: { type: String, default: 'pending' },
    round: {type: Number, default: 1 },
    lastBetTime: { type: Date, default: Date.now },
    betTimeLimit: { type: Number, default: 300 }, // Time limit in seconds
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Wager', wagerSchema);
