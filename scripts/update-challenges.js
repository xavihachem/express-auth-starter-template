/**
 * Script to update challenge status
 * This script deactivates the specified daily challenges
 */

const mongoose = require('mongoose');
const Challenge = require('../models/challenge');

// Connect to the database
mongoose.connect('mongodb://localhost:27017/auth')
  .then(() => {
    console.log('Connected to database');
    updateChallenges();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

async function updateChallenges() {
  try {
    // Update the challenges to set them as inactive
    const result = await Challenge.updateMany(
      { id: { $in: ['visit-team', 'update-profile', 'invite-friend'] } },
      { active: false }
    );

    console.log(`Updated ${result.modifiedCount} challenges`);
    
    // Verify the updated challenges
    const updatedChallenges = await Challenge.find({ 
      id: { $in: ['visit-team', 'update-profile', 'invite-friend'] } 
    });
    
    console.log('Updated challenge status:');
    updatedChallenges.forEach(challenge => {
      console.log(`- ${challenge.title}: active = ${challenge.active}`);
    });
    
    // List all active challenges
    const activeChallenges = await Challenge.find({ active: true });
    console.log('\nRemaining active challenges:');
    activeChallenges.forEach(challenge => {
      console.log(`- ${challenge.title}`);
    });
    
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error updating challenges:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
