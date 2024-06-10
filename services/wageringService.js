/**
 * Wagering Service
 * Handles operations related to placing, accepting, and resolving wagers.
 */

const Wager = require('../models/Wager');
const Match = require('../models/Match');
const BetTransaction = require('../models/BetTransaction');
const { Client } = require('@hiveio/dhive');
const client = new Client(process.env.HIVE_NODE);

const verifySignature = async (username, signature, data) => {
    // check if Match ID is valid
    const match = await Match.findOne({ matchId: data.matchId });
    if (!match) return false;
    const publicKey = (await client.database.getAccounts([username]))[0].posting.key_auths[0][0];
    return client.broadcast.verify({ account: username, sign: signature, data }, publicKey);
};


const Check = async (username, matchId) => {
    // const isValid = await verifySignature(playerId, signature, { matchId, wagerAmount });
    // if (!isValid) return { success: false, message: 'Invalid signature' };

    // Get Match round
    const match = await Match.findOne({ matchId });
    if (!match) return false;

    const wager = await Wager.findOne({ matchId });
    console.log(wager.playerStats);

    // Ensure wager.playerStats is a Map
    if (!(wager.playerStats instanceof Map)) {
        return { success: false, message: 'playerStats is not a Map' };
    }

    // Get the player's stats
    const playerStats = wager.playerStats.get(username);

    // Check if the player's stats exist
    if (!playerStats) {
        return { success: false, message: 'Player not found' };
    }

    // Update the player's status
    playerStats.status = 'checked';
    wager.playerStats.set(username, playerStats);

    // Save the updated wager
    await wager.save();

    return { success: true, message: 'checked successfully' };
};

const Bet = async (username, matchId, wagerAmount, signature) => {
    // const isValid = await verifySignature(playerId, signature, { matchId, wagerAmount });
    // if (!isValid) return { success: false, message: 'Invalid signature' };
    console.log("Match ID: ", matchId);
    const match = await Match.findOne({ matchId });
    if (!match) return false;
    const round = match.round;
    const betTransaction = await BetTransaction.create({
        matchId: matchId,
        player: username,
        round: round,
        amount: wagerAmount,
        signature: signature,
        type: 'bet'
    });

    const wager = await Wager.findOne({ matchId });
    console.log(wager.playerStats);

    // Ensure wager.playerStats is a Map
    if (!(wager.playerStats instanceof Map)) {
        return { success: false, message: 'playerStats is not a Map' };
    }

    // Get the player's stats
    const playerStats = wager.playerStats.get(username);

    // Check if the player's stats exist
    if (!playerStats) {
        return { success: false, message: 'Player not found' };
    }

    // Update the player's status
    playerStats.status = 'bet';
    wager.playerStats.set(username, playerStats);
    // betTransactions with status 'pending'
    wager.betTransactions.push({
        transactionId: betTransaction._id,
        status: "pending"
    });
    // Save the updated wager
    await wager.save();
    return { success: true, message: 'Wager placed successfully' };
};

const Call = async (matchId, username, signature, betId) => {
    const wager = await Wager.findOne({ matchId });
    if (!wager) return { success: false, message: 'Wager not found' };

    // Find and update the BetTransaction
    const betTransaction = await BetTransaction.findById(betId);
    if (!betTransaction) return { success: false, message: 'BetTransaction not found' };

    betTransaction.responder = username;
    betTransaction.status = 'called';
    await betTransaction.save();

    // Find and update the corresponding transaction in wager.betTransactions
    const transaction = wager.betTransactions.find(t => t.transactionId === betId);
    if (!transaction) return { success: false, message: 'Transaction not found in wager' };

    transaction.status = 'called';
    wager.status = 'called';
    wager.player1Wager = wager.player1Wager + betTransaction.amount;
    wager.player2Wager = wager.player2Wager + betTransaction.amount;
    wager.totalPool = wager.totalPool + betTransaction.amount * 2;
    await wager.save();

    return { success: true, message: 'Bet Called' };
};

const Raise = async (matchId, username, signature, betId, raiseAmount) => {
    console.log("Bet ID: ", betId);
    const match = await Match.findOne({ matchId });
    if (!match) return false;
    const round = match.round;
    const wager = await Wager.findOne({ matchId });
    if (!wager) return { success: false, message: 'Wager not found' };

    // Find and update the BetTransaction
    const betTransaction = await BetTransaction.findById(betId);
    if (!betTransaction) return { success: false, message: 'BetTransaction not found' };

    betTransaction.status = 'raised';
    await betTransaction.save();

    // Find and update the corresponding transaction in wager.betTransactions
    const transaction = wager.betTransactions.find(t => t.transactionId === betId);
    if (!transaction) return { success: false, message: 'Transaction not found in wager' };

    transaction.status = 'raised';
    console.log("Raise Amount: ", raiseAmount);
    // Create a new BetTransaction with the raised amount
    const raisedBetTransaction = await BetTransaction.create({
        matchId: matchId,
        player: username,
        round: round,
        amount: raiseAmount,
        signature: signature,
        status: 'pending',
        type: 'raise'
    });
    console.log("Raised Bet Transaction: ", raisedBetTransaction);
    // Add the new BetTransaction to wager.betTransactions
    wager.betTransactions.push({
        transactionId: raisedBetTransaction._id,
        status: raisedBetTransaction.status
    });
    wager.status = 'raised';
    // Save the updated wager
    wager.player1Wager = wager.player1Wager + betTransaction.amount;
    wager.player2Wager = wager.player2Wager + betTransaction.amount;
    wager.totalPool = wager.totalPool + betTransaction.amount * 2;
    await wager.save();

    return { success: true, message: 'Bet Raised' };
};

const Fold = async (matchId, username, signature, betId) => {
    const wager = await Wager.findOne({ matchId });
    if (!wager) return { success: false, message: 'Wager not found' };

    // Find and update the BetTransaction
    const betTransaction = await BetTransaction.findById(betId);
    if (!betTransaction) return { success: false, message: 'BetTransaction not found' };

    betTransaction.responder = username;
    betTransaction.status = 'folded';
    await betTransaction.save();

    // Find and update the corresponding transaction in wager.betTransactions
    const transaction = wager.betTransactions.find(t => t.transactionId === betId);
    if (!transaction) return { success: false, message: 'Transaction not found in wager' };

    transaction.status = 'folded';
    wager.status = 'folded';
    wager.winner = betTransaction.player;
    await wager.save();
    const match = await Match.findOne({ matchId });
    match.status = 'completed';
    const players = match.players;
    const winner = players.find(player => player !== betTransaction.player);
    match.winner = winner;
    await match.save();
    return { success: true, message: 'Bet Folded' };
};

const generateComplianceReport = async (startDate, endDate) => {
    const wagers = await Wager.find({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });
    return wagers;
};
const getMatchWagerDetails = async (matchId) => {
    const wager = await Wager.findOne({matchId});
    return wager;
}

module.exports = { Check, Bet, Call, Fold, Raise, generateComplianceReport, getMatchWagerDetails };
