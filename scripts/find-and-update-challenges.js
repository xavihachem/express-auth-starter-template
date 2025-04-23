/**
 * Script to find and update challenge status
 * This script will find all challenges and deactivate the specified ones
 */

const mongoose = require('mongoose');
const Challenge = require('../models/challenge');

// MongoDB connection - using the same connection string as the main app
mongoose.connect('mongodb://localhost:27017/auth')
  .then(() => {
    console.log('Connected to database');
    findAndUpdateChallenges();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

async function findAndUpdateChallenges() {
  try {
    // First, let's find all challenges to see what we're working with
    const allChallenges = await Challenge.find();
    
    console.log('All challenges in database:');
    allChallenges.forEach(challenge => {
      console.log(`- ID: ${challenge.id}, Title: ${challenge.title}, Active: ${challenge.active}`);
    });
    
    if (allChallenges.length === 0) {
      console.log('No challenges found in the database. They might need to be initialized first.');
      
      // If we need to initialize challenges, we can add code here to do so
      console.log('Would you like to initialize the default challenges with the specified ones already removed?');
      
      mongoose.connection.close();
      return;
    }
    
    // Now let's find challenges that match our criteria (by title since IDs might be different)
    const challengesToUpdate = await Challenge.find({
      title: { $in: ['Visit Team Page', 'Update Profile', 'Invite a Friend'] }
    });
    
    console.log('\nFound challenges to update:');
    challengesToUpdate.forEach(challenge => {
      console.log(`- ID: ${challenge.id}, Title: ${challenge.title}, Active: ${challenge.active}`);
    });
    
    if (challengesToUpdate.length === 0) {
      console.log('No matching challenges found to update.');
      mongoose.connection.close();
      return;
    }
    
    // Collect IDs of challenges to update
    const idsToUpdate = challengesToUpdate.map(c => c.id);
    
    // Update the challenges to set them as inactive
    const result = await Challenge.updateMany(
      { id: { $in: idsToUpdate } },
      { active: false }
    );

    console.log(`\nUpdated ${result.modifiedCount} challenges`);
    
    // Verify the updated challenges
    const updatedChallenges = await Challenge.find({ id: { $in: idsToUpdate } });
    
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
