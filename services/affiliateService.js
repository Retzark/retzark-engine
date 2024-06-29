const Purchase = require('../models/Purchase');

const getAffiliateEarnings = async (affiliateCode) => {
    const affiliatePercentage = parseFloat(process.env.AFFILIATE_PERCENTAGE);
    const purchases = await Purchase.find({ affiliateCode });
    const totalEarnings = purchases.reduce((sum, purchase) => {
        return sum + (purchase.amount * affiliatePercentage);
    }, 0);
    return { affiliateCode, earnings: totalEarnings };
};

module.exports = {
    getAffiliateEarnings,
};