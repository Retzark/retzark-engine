const axios = require('axios');
const crypto = require('crypto');
const { Client, PrivateKey } = require('@hiveio/dhive');
const mongoose = require('mongoose');
require('dotenv').config();
const HIVE_NODE = process.env.HIVE_NODE || 'https://api.openhive.network';
const client = new Client(HIVE_NODE, { timeout: 8000, failoverThreshold: 10 });
const PORT = process.env.PORT || 3000;
const BASE_URL = 'http://localhost:' + PORT;

const Card = require('../models/Card'); // Assuming the card model is in the models directory

// Join the waiting room
const joinWaitingRoom = async (botName) => {
    const ops = [{
        required_auths: [],
        required_posting_auths: [botName],
        id: 'RZ_JOIN_WAITING_ROOM',
        json: JSON.stringify({ username: botName })
    }];

    try {
        const result = await client.broadcast.json(ops[0], PrivateKey.from(process.env[`POSTING_KEY_${botName.toUpperCase()}`]));
        const response = await axios.post(`${BASE_URL}/match/joinWaitingRoom`, {
            txID: result,
            player: botName
        });
        console.log("response:", response.data);
        console.log(`Player ${botName} joined the waiting room.`);
        console.log('Transaction posted:', result);
    } catch (error) {
        console.error('Failed to post transaction:', error);
    }
};

// Main function to start the bot
const startBot = async (botName) => {
    await sleep(10000); // Wait for 10 seconds before starting
    await joinWaitingRoom(botName);
    await monitorMatchmaking(botName);
};

// Continuously monitor for matchmaking
const monitorMatchmaking = async (botName) => {
    while (true) {
        const matchId = await fetchUserMatch(botName);
        if (matchId) {
            console.log(`Match found: ${matchId}`);
            await playMatch(matchId, botName);
            await sleep(15000); // Wait for 10 seconds before checking again
        } else {
            console.log('Waiting for a match...');
            await sleep(15000); // Wait for 10 seconds before checking again
        }
    }
};

// Fetch the current match ID for the player
const fetchUserMatch = async (botName) => {
    const response = await axios.get(`${BASE_URL}/player/${botName}`);
    const playerData = response.data;
    if (playerData && playerData.matchId) {
        return playerData.matchId;
    }
    return null;
};

// Utility function to pause execution for a given time
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Play through the match rounds
const playMatch = async (matchId, botName) => {
    let round = 1;
    while (true) {
        const matchDetails = await fetchMatchDetails(matchId);
        if (matchDetails.status === 'completed') {
            console.log('Match completed.');
            break;
        }
        if (matchDetails.round === round) {
            console.log(`Waiting for round ${round}...`)
            const previousRound = matchDetails.round - 1;
            const survivingCards = getSurvivingCards(matchDetails, previousRound);
            await playRound(matchId, matchDetails.round, survivingCards, botName);
            round++;
        }
        await sleep(15000); // Wait for 15 seconds before checking the round status again
    }
    const playerData = await fetchUserMatch();
    if (playerData && (playerData.status === 'In waiting room' || playerData.status === 'In a match')) {
        console.log(`Player ${botName} is in the waiting room or in a match.`);
    } else {
        console.log(`Player ${botName} is not in the waiting room or in a match.`);
        await sleep(10000); // Wait for 10 seconds before joining the waiting room again
        await joinWaitingRoom(botName, PrivateKey.from(process.env[`POSTING_KEY_${botName.toUpperCase()}`])); // Join the waiting room again after the match is completed
    }
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
const playRound = async (matchId, round, survivingCards, botName) => {
    const cardIds = await selectRandomCards(survivingCards, botName);
    console.log(`Playing round ${round} with cards:`, cardIds);
    const cardHash = crypto.createHash('sha256').update(JSON.stringify(cardIds)).digest('hex');
    console.log('Card hash:', cardHash);
    await submitCardSelection(matchId, cardHash, botName);
    while (true) {
        await sleep(10000); // Wait for 10 seconds before revealing the cards
        const matchDetails = await fetchMatchDetails(matchId);
        const player1 = matchDetails.players[0];
        const player2 = matchDetails.players[1];
        console.log('Waiting for opponent to submit their card hash...');
        console.log('Card Hashes:', matchDetails.cardHashes);
        console.log("round:", round);
        if (matchDetails.status === 'completed') {
            console.log('Match completed.');
            break;
        }
        if (matchDetails.cardHashes && matchDetails.cardHashes[round] && matchDetails.cardHashes[round][player1] && matchDetails.cardHashes[round][player2]) {
            console.log("Card Hashes length:", matchDetails.cardHashes[round]);
            console.log('Opponent has submitted their card hash.');
            console.log('Revealing cards...');
            console.log('Card Hashes:', matchDetails.cardHashes);
            console.log("cardHash:", cardHash);
            await revealCards(matchId, cardIds, botName);
            break;
        }
    }
};

// Randomly select cards ensuring the total energy cost is within the limit
const selectRandomCards = async (survivingCards, botName) => {
    console.log('Selecting cards from:', survivingCards);

    if (survivingCards[0] && survivingCards[0][botName]) {
        survivingCards = survivingCards[0][botName];
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
const submitCardSelection = async (matchId, cardHash, botName) => {
    const ops = [{
        required_auths: [],
        required_posting_auths: [botName],
        id: 'RZ_CARD_SELECTION',
        json: JSON.stringify({ hash: cardHash })
    }];

    try {
        const result = await client.broadcast.json(ops[0], PrivateKey.from(process.env[`POSTING_KEY_${botName.toUpperCase()}`]));
        const response = await axios.post(`${BASE_URL}/match/submitCardsHash`, {
            txID: result,
            player: botName
        });
        console.log(`Card selection hash submitted for match ${matchId}.`);
        console.log('Transaction posted:', result);
    } catch (error) {
        console.error('Failed to post transaction:', error);
        await submitCardSelection(matchId, cardHash, botName) // Retry if the transaction fails
    }
};

// Reveal the selected cards once both players have submitted their hashes
const revealCards = async (matchId, cardIds, botName) => {
    // Extract only the IDs from the cards
    console.log('Revealing cards:', cardIds);
    const response = await axios.post(`${BASE_URL}/match/reveal/${matchId}`, {
        player: botName,
        cards: cardIds
    });

    console.log('Cards revealed:', response.data);
};

module.exports = { startBot };
