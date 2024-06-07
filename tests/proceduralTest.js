const { handleJoinRequest, handleCardSelection } = require('../utils/transactionHandler');
const axios = require('axios');
const crypto = require('crypto');

const runProceduralTest = async () => {
    const player1 = 'player1';
    const player2 = 'player2';

    // Simulate join requests
    await simulateJoinRequest(player1);
    await simulateJoinRequest(player2);

    // Wait for matchmaking to complete
    setTimeout(async () => {
        const matchId1 = await fetchUserMatch(player1);
        const matchId2 = await fetchUserMatch(player2);

        if (matchId1 && matchId1 === matchId2) {
            const matchId = matchId1;
            const rounds = [
                { player1Cards: [4, 999, 24], player2Cards: [3, 18, 999] },
                { player1Cards: [4, 87, 24], player2Cards: [54, 18, 78] },
                { player1Cards: [4, 87, 24], player2Cards: [54, 5, 78] },
                { player1Cards: [999, 87, 53], player2Cards: [54, 23, 78] },
                { player1Cards: [999, 87, 53], player2Cards: [54, 5, 85] },
                { player1Cards: [999, 87, 53], player2Cards: [54, 23, 32] },
                { player1Cards: [34, 87, 25], player2Cards: [54, 999, 32] }
            ];

            for (const round of rounds) {
                const player1CardHash = crypto.createHash('sha256').update(JSON.stringify(round.player1Cards)).digest('hex');
                const player2CardHash = crypto.createHash('sha256').update(JSON.stringify(round.player2Cards)).digest('hex');

                // Simulate card selection
                await simulateCardSelection(player1, matchId, player1CardHash);
                await simulateCardSelection(player2, matchId, player2CardHash);

                // Wait for card reveal
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // Simulate reveal cards
                await simulateRevealCards(matchId, player1, round.player1Cards);
                await simulateRevealCards(matchId, player2, round.player2Cards);

                // Poll the match API to check if the round has incremented
                await new Promise((resolve) => setTimeout(resolve, 2000));
                const matchDetails = await fetchMatchDetails(matchId);
                if (matchDetails.status === 'completed') {
                    console.log('Match completed.');
                    break;
                }else if (matchDetails.round-1 <= rounds.length) {
                    console.log(`Round ${matchDetails.round-1} completed.`);
                } else {
                    console.error('Match round did not increment as expected.');
                    break;
                }
            }
        } else {
            console.error('Matchmaking failed or match IDs do not match.');
        }
    }, 50000);
};

const simulateJoinRequest = async (username) => {
    const data = {
        required_posting_auths: [username],
        id: 'RZ_JOIN_WAITING_ROOM',
        json: JSON.stringify({ username })
    };
    await handleJoinRequest(data);
};

const simulateCardSelection = async (username, matchId, cardHash) => {
    const data = {
        required_posting_auths: [username],
        id: 'RZ_CARD_SELECTION',
        json: JSON.stringify({ hash: cardHash })
    };
    await handleCardSelection(data);
};

const simulateRevealCards = async (matchId, player, cards) => {
    const response = await axios.post(`http://localhost:3000/match/reveal/${matchId}`, {
        player,
        cards
    });
    console.log('Reveal Cards Response:', response.data);
};

const fetchUserMatch = async (username) => {
    const response = await axios.get(`http://localhost:3000/player/${username}`);
    const playerData = response.data;
    if (playerData && playerData.matchId) {
        return playerData.matchId;
    }
    return null;
};

const fetchMatchDetails = async (matchId) => {
    const response = await axios.get(`http://localhost:3000/match/${matchId}`);
    return response.data;
};

module.exports = { runProceduralTest };
