const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    hp: { type: Number, required: true },
    atk: { type: Number, required: true },
    spd: { type: Number, required: true },
    egy: { type: Number, required: true },
    rarity: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Card', cardSchema);
