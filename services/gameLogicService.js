/**
 * Game Logic Service
 * Contains the core game logic for calculating match outcomes.
 */
const Match = require('../models/Match');
const Card = require('../models/Card');
const Player = require('../models/Player');
const { activeMatches } = require("../services/matchmakingService");
const { determineCardOrder, simulateRound, calculateDamage, applyDamage, updateGameState, checkWinConditions } = require('./gameLogicHelpers');

const calculateMatchOutcome = async (matchId) => {
    try {
        // Get match details from database
        const match = await Match.findOne({ matchId });
        if (!match) throw new Error('Match not found');

        // Check if the current round is not the first round
        if (match.round > 1) {
            const previousRound = match.round - 1;
            const remainingCards = match.remainingCards.get(previousRound.toString());

            // Ensure that the cards played in the current round match the remaining cards from the previous round
            for (const player of match.players) {
                match.playerStats.get(player).energy = 8 + (match.round - 1);
                const remainingPlayerCards = remainingCards[0][player];
                const currentPlayerCards = match.cardsPlayed[match.round][player];

                for (let i = 0; i < remainingPlayerCards.length; i++) {
                    if (remainingPlayerCards[i].id !== 999 && remainingPlayerCards[i].id !== currentPlayerCards[i]) {
                        throw new Error(`Player ${player}'s card at position ${i} does not match the remaining card from the previous round`);
                    }
                }
            }
        }

        const cards = match.cardsPlayed[match.round];
        let cardDetails = {};

        // Fetch card details from database
        for (const player in cards) {
            const cardIds = cards[player];
            const fetchedCards = await Card.find({ id: { $in: cardIds } });

            // Create a map for easy lookup by card id
            const cardMap = {};
            fetchedCards.forEach(card => {
                cardMap[card.id] = card;
            });

            // Ensure the order of cardDetails matches the order in cards
            cardDetails[player] = cardIds.map(cardId => cardMap[cardId]);
        }

        // Update card details with health from previous round
        if (match.round > 1) {
            const previousRound = match.round - 1;
            const remainingCards = match.remainingCards.get(previousRound.toString());
            for (const player of match.players) {
                const previousCards = remainingCards[0][player];
                for (let i = 0; i < previousCards.length; i++) {
                    if (previousCards[i].id !== 999) {
                        const cardId = previousCards[i].id;
                        cardDetails[player].forEach(c => {
                            if (c.id === cardId){
                                c.hp = previousCards[i].hp;
                            }
                        });
                    }
                }
            }
        }

        // Deduct energy for each card played by each player
        for (const player in cardDetails) {
            const playerCards = cardDetails[player];
            let totalEnergyCost = 0;
            playerCards.forEach(card => {
                totalEnergyCost += card.egy; // Assuming each card has an energyCost property
            });
            match.playerStats.get(player).energy -= totalEnergyCost;
            if (match.playerStats.get(player).energy < 0) {
                return;
            }
        }

        // Simulate the round
        let winner = await simulateRound(cardDetails, match);
        console.log("Round1:", match.round);
        if (!winner && match.round === 7) {
            winner = await checkWinConditions(matchId, match.round);
        }
        // Check win conditions
        if (winner) {
            console.log("Winner: ", winner.winner);
            match.winner = winner.winner;
            match.status = 'completed';
            console.log("Players: ", );
            delete activeMatches[winner.loser];
            delete activeMatches[winner.winner];
            let winningPlayer = await Player.findOne({ username: winner.winner });
            let losingPlayer = await Player.findOne({ username: winner.loser });

            winningPlayer.wins++;
            console.log("Mana Wagered: ", match.totalManaPool);
            winningPlayer.xp += match.totalManaPool;
            if (losingPlayer.xp < match.totalManaPool / 2) {
                losingPlayer.xp = 0;
            }
            losingPlayer.manaBalance -= match.totalManaPool / 2;
            winningPlayer.manaBalance -= match.totalManaPool / 2;

            await losingPlayer.save();
            await winningPlayer.save();
        }

        // Increment the round and save the match
        console.log("Round2:", match.round);
        match.round++;
        await match.save();
        console.log("Round3:", match.round);
    } catch (error) {
        console.error('Error calculating match outcome:', error);
        throw error;
    }
};

module.exports = { calculateMatchOutcome };
