/**
 * Script to clean up completed challenges references
 * This removes references to deleted challenges from user profiles
 */

const mongoose = require('mongoose');
const User = require('../models/user');
const Challenge = require('../models/challenge');

// Connect to the database
mongoose.connect('mongodb://localhost:27017/auth')
  .then(() => {
    console.log('Connected to database');
    cleanupCompletedChallenges();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

async function cleanupCompletedChallenges() {
  try {
    // Get all active challenge IDs
    const activeChallenge = await Challenge.find({ active: true });
    const activeChallengeIds = activeChallenge.map(c => c.id);
    
    console.log('Active challenge IDs:', activeChallengeIds);
    
    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to check`);
    
    let updatedCount = 0;
    
    // Process each user
    for (const user of users) {
      // If the user has completed challenges
      if (user.completedChallenges && user.completedChallenges.length > 0) {
        console.log(`User ${user.name} (${user._id}) has ${user.completedChallenges.length} completed challenges`);
        
        // Filter out references to challenges that are no longer active
        const validCompletedChallenges = user.completedChallenges.filter(
          challengeId => activeChallengeIds.includes(challengeId)
        );
        
        // If we removed any challenges
        if (validCompletedChallenges.length !== user.completedChallenges.length) {
          console.log(`Updating user ${user.name} - removing ${user.completedChallenges.length - validCompletedChallenges.length} invalid challenge references`);
          
          // Update the user document
          await User.updateOne(
            { _id: user._id },
            { $set: { completedChallenges: validCompletedChallenges } }
          );
          
          updatedCount++;
        }
      }
    }
    
    console.log(`\nCleanup complete: updated ${updatedCount} users`);
    
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error cleaning up completed challenges:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
