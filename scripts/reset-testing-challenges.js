/**
 * Script to reset specific challenges for a user to test challenge functionality
 * This is a development tool and should not be used in production
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/express-auth-starter')
    .then(() => console.log('Connected to database for challenge reset'))
    .catch(err => {
        console.error('Database connection error:', err);
        process.exit(1);
    });

// Function to reset challenges
async function resetChallenges(email, challengesToReset) {
    try {
        // Find user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            console.error(`User with email ${email} not found`);
            return;
        }
        
        console.log(`Found user: ${user.name} (${user.email})`);
        console.log(`Current completed challenges: ${JSON.stringify(user.completedChallenges || [])}`);
        console.log(`Current challenge points: ${user.challengePoints || 0}`);
        
        // If no specific challenges provided, reset all challenges
        if (!challengesToReset || challengesToReset.length === 0) {
            // Save current points for logging
            const previousPoints = user.challengePoints || 0;
            
            // Reset all challenges
            user.completedChallenges = [];
            user.challengePoints = 0;
            user.lastChallengeReset = new Date();
            
            await user.save();
            
            console.log(`Reset ALL challenges for user ${user.name}`);
            console.log(`Points before: ${previousPoints}, Points after: ${user.challengePoints}`);
        } else {
            // Only reset specific challenges
            const initialChallenges = [...(user.completedChallenges || [])];
            const pointsBeforeReset = user.challengePoints || 0;
            
            // Calculate points to subtract
            let pointsToSubtract = 0;
            challengesToReset.forEach(challengeId => {
                if (challengeId === 'daily-login') pointsToSubtract += 1;
                if (challengeId === 'start-investing') pointsToSubtract += 2;
            });
            
            // Filter out the challenges to reset
            user.completedChallenges = (user.completedChallenges || [])
                .filter(id => !challengesToReset.includes(id));
            
            // Subtract points
            user.challengePoints = Math.max(0, (user.challengePoints || 0) - pointsToSubtract);
            
            await user.save();
            
            console.log(`Reset specific challenges for user ${user.name}:`);
            console.log(`Challenges reset: ${JSON.stringify(challengesToReset)}`);
            console.log(`Challenges before: ${JSON.stringify(initialChallenges)}`);
            console.log(`Challenges after: ${JSON.stringify(user.completedChallenges)}`);
            console.log(`Points before: ${pointsBeforeReset}, Points after: ${user.challengePoints}`);
        }
    } catch (err) {
        console.error('Error resetting challenges:', err);
    } finally {
        // Disconnect from database
        mongoose.disconnect();
    }
}

// Get email from command line arguments
const email = process.argv[2];
const challengesToReset = process.argv.slice(3);

if (!email) {
    console.error('Please provide an email address: node reset-testing-challenges.js user@example.com [challengeId1 challengeId2 ...]');
    process.exit(1);
}

// Run the reset function
resetChallenges(email, challengesToReset)
    .then(() => {
        console.log('Challenge reset complete!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error in reset process:', err);
        process.exit(1);
    });
