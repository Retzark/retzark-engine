const mongoose = require('mongoose');

const retRewardSchema = new mongoose.Schema({
    rewards: { type: Map, of: Number, required: true }
});

module.exports = mongoose.model('RetReward', retRewardSchema);
