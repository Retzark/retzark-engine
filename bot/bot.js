const axios = require('axios');
const crypto = require('crypto');
const { Client, PrivateKey } = require('@hiveio/dhive');
const mongoose = require('mongoose');
require('dotenv').config();

const PLAYER_USERNAME = process.env.BOT_ACCOUNT;
const POSTING_KEY = PrivateKey.from(process.env.POSTING_KEY);
const HIVE_NODE = process.env.HIVE_NODE || 'https://api.openhive.network';
const client = new Client(HIVE_NODE, { timeout: 8000, failoverThreshold: 10 });

const BASE_URL = 'http://localhost:3000';

const Card = require('../models/Card'); // Assuming the card model is in the models directory

// Join the waiting room
const joinWaitingRoom = async () => {
    const ops = [{
        required_auths: [],
        required_posting_auths: [PLAYER_USERNAME],
        id: 'RZ_JOIN_WAITING_ROOM',
        json: JSON.stringify({ username: PLAYER_USERNAME })
    }];

    try {
        const result = await client.broadcast.json(ops[0], POSTING_KEY);
        console.log(`Player ${PLAYER_USERNAME} joined the waiting room.`);
        console.log('Transaction posted:', result);
    } catch (error) {
        console.error('Failed to post transaction:', error);
    }
};

// Main function to start the bot
const startBot = async () => {
    await sleep(10000); // Wait for 10 seconds before starting
    await joinWaitingRoom();
    await monitorMatchmaking();
};

// Continuously monitor for matchmaking
const monitorMatchmaking = async () => {
    while (true) {
        const matchId = await fetchUserMatch();
        if (matchId) {
            console.log(`Match found: ${matchId}`);
            await playMatch(matchId);
        } else {
            console.log('Waiting for a match...');
            await sleep(10000); // Wait for 10 seconds before checking again
        }
    }
};

// Fetch the current match ID for the player
const fetchUserMatch = async () => {
    const response = await axios.get(`${BASE_URL}/player/${PLAYER_USERNAME}`);
    const playerData = response.data;
    if (playerData && playerData.matchId) {
        return playerData.matchId;
    }
    return null;
};

// Utility function to pause execution for a given time
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Play through the match rounds
const playMatch = async (matchId) => {
    let round = 1;
    while (true) {
        const matchDetails = await fetchMatchDetails(matchId);
        if (matchDetails.status === 'completed') {
            console.log('Match completed.');
            break;
        }
        if (matchDetails.round <= round) {
            const previousRound = matchDetails.round - 1;
            const survivingCards = getSurvivingCards(matchDetails, previousRound);
            await playRound(matchId, matchDetails.round, survivingCards);
            round++;
        }
        await sleep(10000); // Wait for 10 seconds before checking the round status again
    }
    await joinWaitingRoom(); // Join the waiting room again after the match is completed
};

// Fetch the current match details
const fetchMatchDetails = async (matchId) => {
    const response = await axios.get(`${BASE_URL}/match/${matchId}`);
    return response.data;
};

// Determine the surviving cards from the previous round
const getSurvivingCards = (matchDetails, round) => {
    if (round <= 0) return [];
    return matchDetails.remainingCards[round] || [];
};

// Handle the logic for a single round
const playRound = async (matchId, round, survivingCards) => {
    const cardIds = await selectRandomCards(survivingCards);
    console.log(`Playing round ${round} with cards:`, cardIds);
    const cardHash = crypto.createHash('sha256').update(JSON.stringify(cardIds)).digest('hex');
    console.log('Card hash:', cardHash);
    await submitCardSelection(matchId, cardHash);
    while (true) {
        await sleep(10000); // Wait for 10 seconds before revealing the cards
        const matchDetails = await fetchMatchDetails(matchId);
        const player1 = matchDetails.players[0];
        const player2 = matchDetails.players[1];
        if (matchDetails.cardHashes && matchDetails.cardHashes[round] && matchDetails.cardHashes[round][player1] && matchDetails.cardHashes[round][player2]) {
            console.log("Card Hashes length:", matchDetails.cardHashes[round]);
            console.log('Opponent has submitted their card hash.');
            console.log('Revealing cards...');
            console.log('Card Hashes:', matchDetails.cardHashes);
            console.log("cardHash:", cardHash);
            await revealCards(matchId, cardIds);
            break;
        }
    }
};

// Randomly select cards ensuring the total energy cost is within the limit
const selectRandomCards = async (survivingCards) => {
    console.log('Selecting cards from:', survivingCards);

    if (survivingCards[0] && survivingCards[0][PLAYER_USERNAME]) {
        survivingCards = survivingCards[0][PLAYER_USERNAME];
    } else{
        //survivingCards: [
        //   { id: 999, hp: 0, atk: 0, spd: 0 },
        //   { id: 999, hp: 0, atk: 0, spd: 0 },
        //   { id: 999, hp: 0, atk: 0, spd: 0 }
        // ]
        survivingCards = [{id: 999, hp: 0, atk: 0, spd: 0},
            {id: 999, hp: 0, atk: 0, spd: 0},
            {id: 999, hp: 0, atk: 0, spd: 0}]
    }
    console.log('Surviving cards:', survivingCards);
    const availableCards = await Card.find({ id: { $gte: 0, $lte: 159 } });

    let selectedCards = []; // Start with an empty array
    let totalEnergy = 8; // Initial energy

    // Add surviving cards and calculate remaining energy
    survivingCards.forEach(card => {
        if (card.id !== 999) {
            selectedCards.push(card);
            totalEnergy -= card.egy;
        } else {
            selectedCards.push(card); // Keep the placeholder in the same position
        }
    });

    // Fill in remaining spots with new cards if there's energy left and spots available
    for (let i = 0; i < selectedCards.length; i++) {
        if (selectedCards[i].id === 999) {
            for (let j = 0; j < availableCards.length; j++) {
                const card = availableCards[Math.floor(Math.random() * availableCards.length)];
                if (totalEnergy - card.egy >= 0) {
                    selectedCards[i] = card;
                    totalEnergy -= card.egy;
                    break;
                }
            }
        }
    }

    // If there are still less than 3 cards, fill with placeholders
    while (selectedCards.length < 3) {
        selectedCards.push({ id: 999, egy: 0 });
    }

    // Final array of card IDs
    const cardIds = selectedCards.map(card => card.id);
    console.log('Selected cards:', cardIds);
    return cardIds;
};

// Submit the hash of the selected cards for the current round via a custom JSON transaction
const submitCardSelection = async (matchId, cardHash) => {
    const ops = [{
        required_auths: [],
        required_posting_auths: [PLAYER_USERNAME],
        id: 'RZ_CARD_SELECTION',
        json: JSON.stringify({ hash: cardHash })
    }];

    try {
        const result = await client.broadcast.json(ops[0], POSTING_KEY);
        console.log(`Card selection hash submitted for match ${matchId}.`);
        console.log('Transaction posted:', result);
    } catch (error) {
        console.error('Failed to post transaction:', error);
    }
};

// Reveal the selected cards once both players have submitted their hashes
const revealCards = async (matchId, cardIds) => {
    // Extract only the IDs from the cards
    console.log('Revealing cards:', cardIds);
    const response = await axios.post(`${BASE_URL}/match/reveal/${matchId}`, {
        player: PLAYER_USERNAME,
        cards: cardIds
    });

    console.log('Cards revealed:', response.data);
};

module.exports = { startBot };
