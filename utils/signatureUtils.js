const { ethers } = require('ethers');

/**
 * Verifies if the message was signed by the given eth address.
 *
 * @param {string} message - The original message that was signed.
 * @param {string} signature - The signature produced by signing the message.
 * @param {string} address - The address that supposedly signed the message.
 * @returns {boolean} - True if the signature is valid and produced by the given address.
 */
const ethVerifyMessage = (message, signature, address) => {
    const messageHash = ethers.utils.hashMessage(message);
    const recoveredAddress = ethers.utils.recoverAddress(messageHash, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
};

module.exports = { ethVerifyMessage };
