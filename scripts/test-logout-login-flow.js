/**
 * Script to add debug logs for logout and login flow
 * This helps diagnose why the daily login challenge auto-completion isn't triggering
 */

const mongoose = require('mongoose');
const User = require('../models/user');
require('dotenv').config();

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
        
        console.log(`[SCRIPT] User ${mostRecentUser.name} details:`);
        console.log(`[SCRIPT] - ID: ${mostRecentUser._id}`);
        console.log(`[SCRIPT] - Email: ${mostRecentUser.email}`);
        console.log(`[SCRIPT] - Completed Challenges: ${JSON.stringify(mostRecentUser.completedChallenges || [])}`);
        
        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('[SCRIPT] Disconnected from MongoDB');
        
        console.log('\n[SCRIPT] INSTRUCTIONS:');
        console.log('1. Make sure you are fully logged out (click Sign Out in the top menu)');
        console.log('2. Then log back in with the credentials for this user');
        console.log('3. This should trigger the createSession function that adds the daily login challenge');
        console.log('4. Visit the Challenges page to see if the Daily Login challenge moved to Completed');
    } catch (error) {
        console.error('[SCRIPT] Error:', error);
    }
})
.catch(err => {
    console.error('[SCRIPT] MongoDB connection error:', err);
});
