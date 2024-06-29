const User = require('../models/User');
const Purchase = require('../models/Purchase');

const createPurchase = async (userId, transactionId, pack, amount, affiliateCode) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const purchase = new Purchase({
        transactionId,
        user: userId,
        pack,
        amount,
        affiliateCode: affiliateCode || null,
    });

    await purchase.save();

    if (affiliateCode) {
        const affiliate = await User.findOne({ affiliateCode: affiliateCode });
        if (affiliate) {
            const commission = amount * 0.1; // Assuming a 10% commission

            // Update referrals array
            if (!affiliate.referrals.includes(userId)) {
                affiliate.referrals.push(userId);
                await affiliate.save();
            }
        }
    }
};

module.exports = {
    createPurchase,
};
