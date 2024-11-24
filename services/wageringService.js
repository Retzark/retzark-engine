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

const checkBetTimeLimit = async (wager, username) => {
    const currentTime = new Date();
    const timeDiff = (currentTime - wager.lastBetTime) / 1000; // Convert to seconds

    if (timeDiff > wager.betTimeLimit) {
        // Determine the other player (who wins by forfeit)
        const winner = username === wager.player1 ? wager.player2 : wager.player1;
        
        // Update match status
        const match = await Match.findOne({ matchId: wager.matchId });
        if (match) {
            match.status = 'completed';
            match.winner = winner;
            await match.save();
        }

        // Update wager status
        wager.status = 'forfeited';
        wager.winner = winner;
        await wager.save();

        return { timedOut: true, winner };
    }

    return { timedOut: false };
};

const Check = async (username, matchId) => {
    const match = await Match.findOne({ matchId });
    if (!match) return { success: false, message: 'Match not found' };

    const wager = await Wager.findOne({ matchId });
    if (!wager) return { success: false, message: 'Wager not found' };

    // Check time limit
    const timeCheck = await checkBetTimeLimit(wager, username);
    if (timeCheck.timedOut) {
        return { success: false, message: `Bet time limit exceeded. ${timeCheck.winner} wins by forfeit.` };
    }

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
    const round = match.round;
    wager.round = round;
    
    // Update last bet time
    wager.lastBetTime = new Date();
    
    // Save the updated wager
    await wager.save();

    return { success: true, message: 'checked successfully' };
};

const Bet = async (username, matchId, wagerAmount, signature) => {
    const match = await Match.findOne({ matchId });
    if (!match) return { success: false, message: 'Match not found' };

    const wager = await Wager.findOne({ matchId });
    if (!wager) return { success: false, message: 'Wager not found' };

    // Check time limit
    const timeCheck = await checkBetTimeLimit(wager, username);
    if (timeCheck.timedOut) {
        return { success: false, message: `Bet time limit exceeded. ${timeCheck.winner} wins by forfeit.` };
    }

    const round = match.round;
    const betTransaction = await BetTransaction.create({
        matchId: matchId,
        player: username,
        round: round,
        amount: wagerAmount,
        signature: signature,
        type: 'bet'
    });

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
    wager.round = round;
    
    // Update last bet time
    wager.lastBetTime = new Date();
    
    // betTransactions with status 'pending'
    wager.betTransactions.push({
        transactionId: betTransaction._id.toString(),
        status: "pending",
        amount: wagerAmount,
        betType: 'bet',
        round: round
    });
    
    await wager.save();
    return { success: true, message: 'Wager placed successfully' };
};

const Call = async (matchId, username, signature, betId) => {
    const wager = await Wager.findOne({ matchId });
    if (!wager) return { success: false, message: 'Wager not found' };

    // Check time limit
    const timeCheck = await checkBetTimeLimit(wager, username);
    if (timeCheck.timedOut) {
        return { success: false, message: `Bet time limit exceeded. ${timeCheck.winner} wins by forfeit.` };
    }

    // Find and update the BetTransaction
    const betTransaction = await BetTransaction.findById(betId);
    if (!betTransaction) return { success: false, message: 'BetTransaction not found' };

    // Verify this is a valid bet to call
    const transaction = wager.betTransactions.find(t => t.transactionId === betId.toString());
    if (!transaction) return { success: false, message: 'Transaction not found in wager' };
    if (transaction.status !== 'pending') return { success: false, message: 'Transaction cannot be called' };
    if (betTransaction.player === username) return { success: false, message: 'Cannot call your own bet' };

    betTransaction.responder = username;
    betTransaction.responderSignature = signature;
    betTransaction.status = 'called';
    await betTransaction.save();

    transaction.status = 'called';
    transaction.amount = betTransaction.amount;

    wager.status = 'called';
    wager.player1Wager = wager.player1Wager + betTransaction.amount;
    wager.player2Wager = wager.player2Wager + betTransaction.amount;
    wager.totalPool = wager.totalPool + betTransaction.amount * 2;

    // Update the player's status in playerStats
    if (wager.playerStats instanceof Map) {
        const playerStats = wager.playerStats.get(username);
        if (playerStats) {
            playerStats.status = 'called';
            wager.playerStats.set(username, playerStats);
        }
    }

    const match = await Match.findOne({ matchId });
    if (!match) return { success: false, message: 'Match not found' };
    const round = match.round;
    wager.round = round;
    
    // Update last bet time
    wager.lastBetTime = new Date();
    
    await wager.save();
    return { success: true, message: 'Bet Called' };
};

const Raise = async (matchId, username, signature, betId, raiseAmount) => {
    const match = await Match.findOne({ matchId });
    if (!match) return { success: false, message: 'Match not found' };

    const wager = await Wager.findOne({ matchId });
    if (!wager) return { success: false, message: 'Wager not found' };

    // Check time limit
    const timeCheck = await checkBetTimeLimit(wager, username);
    if (timeCheck.timedOut) {
        return { success: false, message: `Bet time limit exceeded. ${timeCheck.winner} wins by forfeit.` };
    }

    const round = match.round;

    // Find and update the BetTransaction
    const betTransaction = await BetTransaction.findById(betId);
    if (!betTransaction) return { success: false, message: 'BetTransaction not found' };

    // Verify this is a valid bet to raise
    const transaction = wager.betTransactions.find(t => t.transactionId === betId.toString());
    if (!transaction) return { success: false, message: 'Transaction not found in wager' };
    if (transaction.status !== 'pending') return { success: false, message: 'Transaction cannot be raised' };
    if (betTransaction.player === username) return { success: false, message: 'Cannot raise your own bet' };

    betTransaction.status = 'raised';
    await betTransaction.save();

    transaction.status = 'raised';

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

    // Add the new BetTransaction to wager.betTransactions
    wager.betTransactions.push({
        transactionId: raisedBetTransaction._id.toString(),
        status: raisedBetTransaction.status,
        amount: raiseAmount,
        betType: 'raise'
    });
    wager.status = 'raised';
    
    // Update last bet time
    wager.lastBetTime = new Date();
    
    // Save the updated wager
    wager.player1Wager = wager.player1Wager + betTransaction.amount;
    wager.player2Wager = wager.player2Wager + betTransaction.amount;
    wager.totalPool = wager.totalPool + betTransaction.amount * 2;

    // Update the player's status in playerStats
    if (wager.playerStats instanceof Map) {
        const playerStats = wager.playerStats.get(username);
        if (playerStats) {
            playerStats.status = 'raised';
            wager.playerStats.set(username, playerStats);
        }
    }
    wager.round = round;
    await wager.save();

    return { success: true, message: 'Bet Raised' };
};

const Fold = async (matchId, username, signature, betId) => {
    const wager = await Wager.findOne({ matchId });
    if (!wager) return { success: false, message: 'Wager not found' };

    // Check time limit
    const timeCheck = await checkBetTimeLimit(wager, username);
    if (timeCheck.timedOut) {
        return { success: false, message: `Bet time limit exceeded. ${timeCheck.winner} wins by forfeit.` };
    }

    // Find and update the BetTransaction
    const betTransaction = await BetTransaction.findById(betId);
    if (!betTransaction) return { success: false, message: 'BetTransaction not found' };

    // Verify this is a valid bet to fold
    const transaction = wager.betTransactions.find(t => t.transactionId === betId.toString());
    if (!transaction) return { success: false, message: 'Transaction not found in wager' };
    if (transaction.status !== 'pending') return { success: false, message: 'Transaction cannot be folded' };
    if (betTransaction.player === username) return { success: false, message: 'Cannot fold your own bet' };

    betTransaction.responder = username;
    betTransaction.responderSignature = signature;
    betTransaction.status = 'folded';
    await betTransaction.save();

    transaction.status = 'folded';
    wager.status = 'folded';
    wager.winner = betTransaction.player;

    // Update the player's status in playerStats
    if (wager.playerStats instanceof Map) {
        const playerStats = wager.playerStats.get(username);
        if (playerStats) {
            playerStats.status = 'folded';
            wager.playerStats.set(username, playerStats);
        }
    }
    const match = await Match.findOne({ matchId });
    const round = match.round;
    wager.round = round;
    
    // Update last bet time
    wager.lastBetTime = new Date();
    
    await wager.save();
    match.status = 'completed';
    match.winner = wager.winner;
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
