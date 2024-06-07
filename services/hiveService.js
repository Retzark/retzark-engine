/**
 * Blockchain Service
 * Handles interactions with the Hive blockchain.
 */

const { Client, PrivateKey } = require('@hiveio/dhive');
require('dotenv').config();

const client = new Client([process.env.HIVE_NODE, 'https://api.openhive.network'], {
    timeout: 8000,
    failoverThreshold: 10,
    consoleOnFailover: true
});

const postTransaction = async (jsonData) => {
    const ops = [{
        required_auths: [],
        required_posting_auths: [process.env.BOT_ACCOUNT],
        id: 'retzark_matchmaking',
        json: JSON.stringify(jsonData)
    }];

    try {
        const result = await client.broadcast.json(ops[0], PrivateKey.from(process.env.POSTING_KEY));
        console.log('Transaction posted:', result);
    } catch (error) {
        console.error('Failed to post transaction:', error);
    }
};

module.exports = { postTransaction };
