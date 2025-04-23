/**
 * Script to force reset a user's daily login challenge status
 * For testing auto-completion of the daily login challenge
 */

const mongoose = require('mongoose');
const User = require('../models/user');
require('dotenv').config();

console.log('[SCRIPT] Starting user daily login challenge reset');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('[SCRIPT] Connected to MongoDB');
    
    try {
        // Find all users
        const users = await User.find({}).select('_id name email completedChallenges');
        
        if (users.length === 0) {
            console.log('[SCRIPT] No users found in the database');
            return;
        }
        
        console.log(`[SCRIPT] Found ${users.length} users:`);
        users.forEach((user, index) => {
            console.log(`[SCRIPT] ${index + 1}. ${user.name} (${user.email}): ${JSON.stringify(user.completedChallenges || [])}`);
        });
        
        // Get the most recently created user
        const mostRecentUser = users[users.length - 1];
        
        console.log(`[SCRIPT] Resetting daily login challenge for user: ${mostRecentUser.name}`);
        
        // Remove daily-login from completedChallenges
        let completedChallenges = mostRecentUser.completedChallenges || [];
        completedChallenges = completedChallenges.filter(id => id !== 'daily-login');
        
        // Update the user
        const updateResult = await User.findByIdAndUpdate(mostRecentUser._id, {
            completedChallenges
        }, { new: true });
        
        console.log(`[SCRIPT] Update result: ${!!updateResult}`);
        console.log(`[SCRIPT] New completed challenges: ${JSON.stringify(updateResult.completedChallenges || [])}`);
        console.log(`[SCRIPT] Successfully reset daily login challenge for user ${mostRecentUser.name}`);
        
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
