/**
 * Script to update the Start Investing challenge points and reset user's completed challenges
 */

const mongoose = require('mongoose');
const Challenge = require('../models/challenge');
const User = require('../models/user');

// Connect to the database
mongoose.connect('mongodb://localhost:27017/auth')
  .then(() => {
    console.log('Connected to database');
    updateChallengeAndResetUser();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

async function updateChallengeAndResetUser() {
  try {
    // 1. Update the Start Investing challenge points to 2
    const updateResult = await Challenge.updateOne(
      { id: 'start-investing' },
      { $set: { points: 2 } }
    );
    
    console.log(`Updated challenge points: ${updateResult.modifiedCount} document modified`);
    
    // 2. Reset completed challenges for all users to make them available again
    const resetResult = await User.updateMany(
      {}, // target all users
      { $set: { completedChallenges: [] } }
    );
    
    console.log(`Reset completed challenges for ${resetResult.modifiedCount} users`);
    
    // 3. Show the current state of challenges
    const challenges = await Challenge.find({ active: true });
    console.log('\nCurrent active challenges:');
    challenges.forEach(challenge => {
      console.log(`- ${challenge.title} (${challenge.points} points): ${challenge.description}`);
    });
    
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error updating challenge and resetting users:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
