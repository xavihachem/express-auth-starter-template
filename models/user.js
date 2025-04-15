const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        // Additional fields for admin dashboard
        userCode: {
            type: String,
            immutable: true, // This ensures the field can never be changed once set
            default: function() {
                // Generate a unique code with timestamp component for extra uniqueness
                const timestamp = new Date().getTime().toString().slice(-4);
                const random = Math.floor(100000 + Math.random() * 900000);
                return 'UC' + timestamp + random.toString().substring(0, 2);
            }
        },
        userInvites: {
            type: Number,
            default: 0
        },
        balance: {
            type: Number,
            default: 0
        },
        withdraw: {
            type: Number,
            default: 0
        },
        withdrawWallet: {
            type: String,
            default: ''
        },
        depositWallet: {
            type: String,
            default: ''
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        investmentAccess: {
            type: String,
            enum: ['rejected', 'pending', 'access'],
            default: 'rejected'
        },
        challengePoints: {
            type: Number,
            default: 0
        },
        completedChallenges: {
            type: [String],
            default: []
        },
        lastChallengeReset: {
            type: Date,
            default: Date.now
        },
    },
    {
        timeseries: true,
    }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
