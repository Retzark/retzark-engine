const purchaseService = require('../services/purchaseService');

// Function to create a purchase
const createPurchase = async (req, res) => {
    const { userId, transactionId, pack, amount, affiliateCode } = req.body;
    try {
        await purchaseService.createPurchase(userId, transactionId, pack, amount, affiliateCode);
        res.status(200).send('Purchase successful');
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = {
    createPurchase,
};
