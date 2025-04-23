/**
 * Script to reset the daily login challenge for a specific user
 * Used for testing the automatic daily login challenge completion
 */

const mongoose = require('mongoose');
const User = require('../models/user');
require('dotenv').config();

// Get command line arguments (username or email)
const userIdentifier = process.argv[2];

if (!userIdentifier) {
    console.error('Please provide a username or email as a parameter');
    console.log('Usage: node reset-daily-login-challenge.js [username|email]');
    process.exit(1);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('[SCRIPT] Connected to MongoDB');
    
    try {
        // Find the user by email or username
        const user = await User.findOne({
            $or: [
                { email: userIdentifier },
                { username: userIdentifier }
            ]
        });
        
        if (!user) {
            console.error(`[SCRIPT] User not found with identifier: ${userIdentifier}`);
            process.exit(1);
        }
        
        console.log(`[SCRIPT] Found user: ${user.name} (${user._id})`);
        console.log(`[SCRIPT] Current completed challenges: ${JSON.stringify(user.completedChallenges || [])}`);
        
        // Remove daily-login from completedChallenges
        let completedChallenges = user.completedChallenges || [];
        completedChallenges = completedChallenges.filter(challengeId => challengeId !== 'daily-login');
        
        // Update the user
        await User.findByIdAndUpdate(user._id, {
            completedChallenges
        });
        
        console.log(`[SCRIPT] Successfully reset daily login challenge for user ${user.name}`);
        console.log(`[SCRIPT] New completed challenges: ${JSON.stringify(completedChallenges)}`);
        
        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('[SCRIPT] Disconnected from MongoDB');
    } catch (error) {
        console.error('[SCRIPT] Error:', error);
    }
})
.catch(err => {
    console.error('[SCRIPT] MongoDB connection error:', err);
});
