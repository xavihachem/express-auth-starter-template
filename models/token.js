const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    token: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600, // expire after 600 seconds (10 minutes)
    },
});

// Ensure one token per user at a time
tokenSchema.index({ user: 1 }, { unique: true });

const Token = mongoose.model('token', tokenSchema);
module.exports = Token;
