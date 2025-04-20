const mongoose = require('mongoose');

const otpTokenSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    token: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 // expire after 600 seconds (10 minutes)
    }
});

const OtpToken = mongoose.model('OtpToken', otpTokenSchema);
module.exports = OtpToken;
