const mongoose = require('mongoose');

const wagerSchema = new mongoose.Schema({
    matchId: { type: String, required: true },
    player1: { type: String, required: true },
    player2: { type: String, required: true },
    player1Wager: { type: Number, required: true },
    player2Wager: { type: Number, required: true },
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
            betType: String
        }],
        default: []
    },
    totalPool: { type: Number, required: true },
    winner: { type: String },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Wager', wagerSchema);
