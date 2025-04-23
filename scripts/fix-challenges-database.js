/**
 * Script to clean up challenges database
 * - Removes all challenges except Daily Login and Start Investing
 * - Creates Start Investing challenge if it doesn't exist
 */

const mongoose = require('mongoose');
const Challenge = require('../models/challenge');
require('dotenv').config();

console.log('[SCRIPT] Starting challenges database cleanup');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('[SCRIPT] Connected to MongoDB');
    
    try {
        // Get all current challenges
        const allChallenges = await Challenge.find({});
        console.log(`[SCRIPT] Found ${allChallenges.length} challenges in the database:`);
        allChallenges.forEach(c => {
            console.log(`[SCRIPT] - ${c.id}: ${c.title} (${c.points} points, active: ${c.active})`);
        });
        
        // Remove all challenges except Daily Login
        console.log('[SCRIPT] Removing challenges except Daily Login...');
        const result = await Challenge.deleteMany({ 
            id: { $nin: ['daily-login', 'start-investing'] } 
        });
        console.log(`[SCRIPT] Removed ${result.deletedCount} challenges`);
        
        // Check if Daily Login challenge exists, create if not
        const dailyLoginChallenge = await Challenge.findOne({ id: 'daily-login' });
        
        if (!dailyLoginChallenge) {
            console.log('[SCRIPT] Creating Daily Login challenge...');
            const newDailyLogin = new Challenge({
                id: 'daily-login',
                title: 'Daily Login',
                description: 'Log in to your account today',
                points: 1,
                type: 'daily',
                active: true
            });
            await newDailyLogin.save();
            console.log('[SCRIPT] Daily Login challenge created');
        } else {
            console.log('[SCRIPT] Daily Login challenge already exists');
        }
        
        // Check if Start Investing challenge exists, create if not
        const startInvestingChallenge = await Challenge.findOne({ id: 'start-investing' });
        
        if (!startInvestingChallenge) {
            console.log('[SCRIPT] Creating Start Investing challenge...');
            const newStartInvesting = new Challenge({
                id: 'start-investing',
                title: 'Start Investing',
                description: 'Visit the investments page and start your first investment',
                points: 2,
                type: 'daily',
                active: true
            });
            await newStartInvesting.save();
            console.log('[SCRIPT] Start Investing challenge created');
        } else {
            console.log('[SCRIPT] Start Investing challenge already exists');
        }
        
        // Show final state
        const finalChallenges = await Challenge.find({}).sort({ id: 1 });
        console.log(`[SCRIPT] Final database state - ${finalChallenges.length} challenges:`);
        finalChallenges.forEach(c => {
            console.log(`[SCRIPT] - ${c.id}: ${c.title} (${c.points} points, active: ${c.active})`);
        });
        
        console.log('[SCRIPT] Database cleanup completed successfully');
        
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
