const mongoose = require('mongoose');

const betTransactionSchema = new mongoose.Schema({
    matchId: { type: String, required: true },
    player: { type: String, required: true },
    round: { type: Number, required: true },
    amount: { type: Number, required: true },
    signature: { type: String, required: true },
    responder: { type: String},
    responderSignature: { type: String},
    createdAt: { type: Date, default: Date.now },
    status: { type: String, default: 'pending'},
    type: { type: String, required: true },
});

module.exports = mongoose.model('BetTransaction', betTransactionSchema);
