const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        unique: true,
        required: true,  // Make it required since it will come from another API
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    pack: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    affiliateCode: {
        type: String,
        ref: 'User.affiliateCode',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = Purchase;
