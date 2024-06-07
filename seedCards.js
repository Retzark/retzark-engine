require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Define the Card schema
const Card = require('./models/Card');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
        seedCards();
    })
    .catch(err => {
        console.error('Error connecting to MongoDB', err);
    });

// Function to seed cards
const seedCards = () => {
    const cardsFilePath = path.join(__dirname, 'cards.json');
    const cardsData = JSON.parse(fs.readFileSync(cardsFilePath, 'utf-8'));

    const cardsWithIndex = cardsData.map(card => ({
        id: card.ID,
        name: card.NAME,
        hp: card.HP,
        atk: card.ATK,
        spd: card.SPD,
        egy: card.EGY,
        rarity: card.RARITY
    }));

    Card.insertMany(cardsWithIndex, { ordered: false })
        .then(() => {
            console.log('Cards seeded successfully');
            mongoose.connection.close();
        })
        .catch(err => {
            console.error('Error seeding cards', err);
            mongoose.connection.close();
        });
};
