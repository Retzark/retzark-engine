const Player = require('../models/Player');
const { determineMaxMana } = require('../services/manaService');

const updateMana = async () => {
    try {
        const players = await Player.find({});
        for (let player of players) {
            let rank = player.rank.replace(/[0-9]/g, '').replace(/\s/g, '');
            player.maxManaBalance = determineMaxMana(rank);
            player.currentManaBalance = player.maxManaBalance; // Reset to max daily
            player.manaHistory.push({
                change: player.currentManaBalance - (player.manaHistory.length > 0 ? player.manaHistory[player.manaHistory.length - 1].change : 0),
                reason: 'Daily reset'
            });
            await player.save();
            console.log(`Updated mana for player ${player.username}: max ${player.maxManaBalance}, current ${player.currentManaBalance}`);
        }
        console.log('Mana updated for all players');
    } catch (error) {
        console.error('Error updating mana:', error);
    }
};

module.exports = { updateMana };
