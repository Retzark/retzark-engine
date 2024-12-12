const Match = require('../models/Match');
const winston = require('winston');

// Configure logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

// Constants
const PLACEHOLDER_CARD = { id: 999, hp: 0, atk: 0, spd: 0, egy: 0 };
const PLACEHOLDER_CARD_ID = 999;

// Helper function to determine the target of an attack
const determineTarget = (attacker, cards1, cards2, player1, player2) => {
    const targetIndex = attacker.position; // Determine the target position based on the attacker's position
    const targetPlayer = attacker.player === player1 ? player2 : player1; // Determine the target player
    let target = attacker.player === player1 ? cards2[targetIndex] : cards1[targetIndex]; // Get the target card
    return { target, targetPlayer }; // Return the target card and target player
};

// Helper function to handle placeholder cards (special cards with ID 999)
const handlePlaceholderCards = (attacker, target) => {
    if (attacker.card.id === PLACEHOLDER_CARD_ID) {
        return { skipTurn: true, newTarget: PLACEHOLDER_CARD }; // Skip the attacker's turn if it's a placeholder card
    }
    if (!target || target.id === PLACEHOLDER_CARD_ID) {
        return { skipTurn: false, newTarget: PLACEHOLDER_CARD }; // Attack the base if the target is a placeholder card
    }
    return { skipTurn: false, newTarget: target }; // Continue with the attack if neither are placeholder cards
};

// Helper function to apply damage to a target card and update its health
const applyDamageAndUpdateHealth = async (attacker, target, targetPlayer, match, allCards, battleHistory) => {
    const battle = {[targetPlayer]: {attack: attacker.card.atk, targetCard: target}};
    const health = await applyDamage(battle, match); // Apply damage to the target card
    // Update the health of the target card in the list of all cards
    await allCards.forEach(c => {
        if (c.player === targetPlayer && c.card.id === target.card.id) {
            c.card.hp = health; // Update the card's health
        }
    });
    // Remove the card if its health is zero or less
    if (health <= 0) {
        allCards = await allCards.filter(c => !(c.player === targetPlayer && c.card.id === target.card.id)); // Remove defeated card
    }

    // Log the battle history
    await battleHistory.push({
        attacker: attacker.player,
        target: targetPlayer,
        attackCard: attacker.card,
        targetCard: target,
        targetCardId: target.card.id,
        damage: attacker.card.atk
    });

    return allCards; // Return the updated list of all cards
};

// Main function to simulate a round of the match
const simulateRound = async (cards, match) => {
    const battleHistory = []; // Initialize battle history array
    const players = Object.keys(cards); // Get the list of players
    let winner = null; // Initialize winner variable
    const player1 = players[0];
    const player2 = players[1];
    let cards1 = cards[player1];
    let cards2 = cards[player2];

    const cardPositions1 = cards1.map((card, index) => index); // Get card positions for player 1
    const cardPositions2 = cards2.map((card, index) => index); // Get card positions for player 2

    // Map cards with their player and position
    cards1 = cards1.map((card, index) => ({ player: player1, card, position: cardPositions1[index] }));
    cards2 = cards2.map((card, index) => ({ player: player2, card, position: cardPositions2[index] }));

    let allCards = [
        ...cards1,
        ...cards2
    ];

    // Sort all cards by speed in descending order
    allCards.sort((a, b) => b.card.spd - a.card.spd);

    // Resolve speed ties by doing a coin flip and reordering the cards
    for (let i = 0; i < allCards.length - 1; i++) {
        if (allCards[i].card.spd === allCards[i + 1].card.spd) {
            const coinFlip = 0.5 //Math.random(); // Randomly decide the order of cards with the same speed
            if (coinFlip >= 0.5) {
                const temp = allCards[i];
                allCards[i] = allCards[i + 1];
                allCards[i + 1] = temp;
            }
        }
    }

    // Simulate attacks for each card in order of speed
    for (let i = 0; i < allCards.length; i++) {
        const attacker = allCards[i]; // Get the attacking card
        const { target, targetPlayer } = determineTarget(attacker, cards1, cards2, player1, player2); // Determine the target
        const { skipTurn, newTarget } = handlePlaceholderCards(attacker, target); // Handle placeholder cards
        if (skipTurn) continue; // Skip turn if necessary

        if (newTarget.id === PLACEHOLDER_CARD_ID) {
            // If attacking base
            const baseHealth = match.playerStats.get(targetPlayer).baseHealth;
            const updatedBaseHealth = baseHealth - attacker.card.atk; // Calculate new base health
            match.playerStats.get(targetPlayer).baseHealth = updatedBaseHealth; // Update the in-memory object
            console.log("updatedBaseHealth", updatedBaseHealth);
            await match.updateOne({ [`playerStats.${targetPlayer}.baseHealth`]: updatedBaseHealth }); // Update base health in the database
            // Log battle history for base attack
            battleHistory.push({
                attacker: attacker.player,
                target: targetPlayer,
                attackCard: attacker.card,
                targetCard: null,
                targetCardId: null,
                damage: attacker.card.atk,
                attackedBase: true
            });
        } else {
            // If attacking a card
            allCards = await applyDamageAndUpdateHealth(attacker, newTarget, targetPlayer, match, allCards, battleHistory); // Apply damage and update health
        }
        winner = await checkWinConditionForBase(match.matchId, match.round);
        if (winner) {
            break;
        }
    }

    // Output the battle history at the end of the round
    // Initialize arrays to hold the card IDs for each player
    const player1Cards = [PLACEHOLDER_CARD, PLACEHOLDER_CARD, PLACEHOLDER_CARD]; // Default all positions to placeholder cards
    const player2Cards = [PLACEHOLDER_CARD, PLACEHOLDER_CARD, PLACEHOLDER_CARD]; // Default all positions to placeholder cards

    // Populate the arrays with the actual card IDs in their correct positions
    // console.log("allCards", allCards);
    allCards.forEach(card => {
        if (card.player === player1) {
            player1Cards[card.position] = { id: card.card.id, hp: card.card.hp, atk: card.card.atk, spd: card.card.spd };
        } else if (card.player === player2) {
            player2Cards[card.position] = { id: card.card.id, hp: card.card.hp, atk: card.card.atk, spd: card.card.spd };
        }
    });

    // Store the battle history and remaining cards in the match document
    match.battleHistory.set(match.round.toString(), battleHistory);
    match.remainingCards.set(match.round.toString(), [{
        [player1]: player1Cards,
        [player2]: player2Cards
    }]);
    // Increment the round number
    await match.save();
    return winner;
};

// Helper function to apply damage to a target card
const applyDamage = async (battle, match) => {
    let cardHealth = 0; // Initialize card health variable
    if (!battle) return;
    const player = Object.keys(battle)[0]; // Get the player involved in the battle
    const {attack, targetCard} = battle[player]; // Get the attack and target card details
    cardHealth = targetCard.card.hp;

    // If the target card's health is zero or less, update the base health
    if (cardHealth <= 0) {
        cardHealth = 0;
        if (!match) throw new Error('Match not found'); // Throw an error if the match is not found
        const baseHealth = await match.playerStats.get(player).baseHealth;
        const updatedBaseHealth = baseHealth - attack; // Calculate new base health
        await match.playerStats.get(player).baseHealth = updatedBaseHealth; // Update the in-memory object
        console.log("updatedBaseHealth", updatedBaseHealth);
        await match.updateOne({[`playerStats.${player}.baseHealth`]: updatedBaseHealth}); // Update base health in the database
    } else {
        cardHealth -= attack; // Subtract attack from card's health
    }

    return cardHealth; // Return the updated card health
};

// Helper function to update the game state after each round
const updateGameState = async (matchId, roundOutcomes) => {
    // Retrieve the match data from the database
    try {
        const match = await Match.findOne({ matchId });
        if (!match) throw new Error('Match not found'); // Throw an error if the match is not found

        // Update the match state based on the outcomes of the round
        roundOutcomes.forEach(round => {
            Object.keys(round).forEach(player => {
                const card = round[player];
                if (card.hp <= 0) {
                    // Remove cards with zero or less health from the cardsPlayed list
                    match.cardsPlayed[player] = match.cardsPlayed[player].filter(c => c.cardId !== card.cardId);
                }
            });
        });

        await match.save(); // Save the updated match data to the database
    } catch (error) {
        logger.error(`Error updating game state for match ${matchId}:`, error);
        throw error;
    }
};

// Helper function to check win conditions after each round
const checkWinConditionForBase = async (matchId, roundNumber) => {
    try {
        console.log("checkWinConditions");
        console.log("match roundNumber", roundNumber);
        // Retrieve the match data from the database
        const match = await Match.findOne({ matchId });
        if (!match) throw new Error('Match not found'); // Throw an error if the match is not found
        const players = match.players;
        console.log('players:', players);
        //players: ["player1","player2"]
        console.log('playerStats:', match.playerStats);
        const player1 = players[0];
        const player2 = players[1];
        // Check if either player's base health is zero or less
        if (match.playerStats.get(player1).baseHealth <= 0 || match.playerStats.get(player2).baseHealth <= 0) {
            console.log("player1 baseHealth", match.playerStats.get(player1).baseHealth);
            console.log("player2 baseHealth", match.playerStats.get(player2).baseHealth);
            return {
                winner: match.playerStats.get(player1).baseHealth > 0 ? player1 : player2,
                loser: match.playerStats.get(player1).baseHealth <= 0 ? player1 : player2
            };
        }
        return null; // No winner yet
    } catch (error) {
        logger.error(`Error checking win conditions for match ${matchId}:`, error);
        throw error;
    }
};

const checkWinConditions = async (matchId, roundNumber) => {
    try {
        console.log("checkWinConditions");
        console.log("match roundNumber", roundNumber);
        // Retrieve the match data from the database
        const match = await Match.findOne({ matchId });
        if (!match) throw new Error('Match not found'); // Throw an error if the match is not found
        const players = match.players;
        const player1 = players[0];
        const player2 = players[1];
        // If the maximum number of rounds is reached, determine the winner based on base health
        if (roundNumber >= 7) {
            console.log("roundNumber", roundNumber);
            const player1Damage = match.playerStats.get(player1).baseHealth;
            const player2Damage = match.playerStats.get(player2).baseHealth;
            return {
                winner: player1Damage > player2Damage ? player1 : player2,
                loser: player1Damage <= player2Damage ? player1 : player2
            };

        }
    } catch (error) {
        logger.error(`Error checking win conditions for match ${matchId}:`, error);
        throw error;
    }
}

module.exports = {
    simulateRound,
    checkWinConditions
};
