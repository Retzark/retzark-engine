/**
 * Blockchain Service
 * Handles interactions with the Hive blockchain.
 */

const { Client, PrivateKey } = require('@hiveio/dhive');
const { handleJoinRequest, handleCardSelection } = require('../utils/transactionHandler');
require('dotenv').config();

const client = new Client([process.env.HIVE_NODE, 'https://api.openhive.network'], {
    timeout: 8000,
    failoverThreshold: 10,
    consoleOnFailover: true
});

const startStreamingFrom = async (startBlock) => {
    console.log('Starting blockchain processing from block:', startBlock);

    try {
        const properties = await client.database.getDynamicGlobalProperties();
        const currentBlock = properties.head_block_number;
        for (let blockNum = parseInt(startBlock); blockNum <= currentBlock; blockNum++) {
            console.log('Fetching block:', blockNum);
            const block = await client.database.getBlock(blockNum);
            if (block) {
                console.log('Processing block:', block.block_id);
                processBlock(block);
            }
        }

        console.log('Finished processing historical blocks, now listening to new blocks...');
        client.blockchain.getBlockStream().on('data', processBlock)
            .on('error', error => console.error('Stream error:', error));
    } catch (error) {
        console.error('Failed to fetch current block:', error);
    }
};

const processBlock = (block) => {
    //console log the block number
    console.log('Processing block:', block.transactions[0].block_num);
    block.transactions.forEach(transaction => {
        transaction.operations.forEach(operation => {
            const [type, data] = operation;
            if (type === 'custom_json' && data.json) {
                try {
                    switch (data.id) {
                        case 'RZ_CARD_SELECTION':
                            console.log(data)
                            handleCardSelection(data);
                            break;
                    }
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                }
            }
        });
    });
};

module.exports = { startStreamingFrom };
