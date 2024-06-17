const affiliateService = require('../services/affiliateService');

// Function to get affiliate earnings
const getAffiliateEarnings = async (req, res) => {
    const { affiliateCode } = req.params;
    try {
        const earnings = await affiliateService.getAffiliateEarnings(affiliateCode);
        res.status(200).json(earnings);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = {
    getAffiliateEarnings,
};
