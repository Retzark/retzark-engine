const mongoose = require('mongoose');
const Player = require('../models/Player');
const { determineDailyMana } = require('../services/manaService');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });


// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
        updateMana();
    })
    .catch(err => {
        console.error('Error connecting to MongoDB', err);
        process.exit(1);
    });

const updateMana = async () => {
    try {
        const players = await Player.find({});
        for (let player of players) {
            let rank = player.rank;
            rank = rank.replace(/[0-9]/g, '');
            // Remove the space in the rank
            rank = rank.replace(/\s/g, '');
            player.manaBalance = determineDailyMana(rank);
            await player.save();
        }
        console.log('Mana updated for all players');
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error updating mana:', error);
        await mongoose.connection.close();
    }
};
