const mongoose = require('mongoose');

// Define the Challenge schema
const challengeSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        points: {
            type: Number,
            required: true,
            default: 1
        },
        type: {
            type: String,
            enum: ['daily', 'weekly', 'special'],
            default: 'daily'
        },
        active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Create and export the Challenge model
const Challenge = mongoose.model('Challenge', challengeSchema);
module.exports = Challenge;
