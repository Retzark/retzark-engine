const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    affiliateCode: {
        type: String,
        unique: true,
    },
});

userSchema.pre('save', async function(next) {
    if (this.isNew && !this.affiliateCode) {
        let code;
        let user;
        do {
            code = crypto.randomBytes(3).toString('hex');
            user = await mongoose.models.User.findOne({ affiliateCode: code });
        } while (user);
        this.affiliateCode = code;
    }
    this.updatedAt = Date.now();
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
