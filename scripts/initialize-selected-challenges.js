/**
 * Script to initialize only the selected challenges
 * This script initializes a custom set of challenges, omitting the ones that should be removed
 */

const mongoose = require('mongoose');
const Challenge = require('../models/challenge');

// Connect to the database
mongoose.connect('mongodb://localhost:27017/auth')
  .then(() => {
    console.log('Connected to database');
    initializeSelectedChallenges();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

async function initializeSelectedChallenges() {
  try {
    // First, check if any challenges already exist
    const existingChallenges = await Challenge.countDocuments();
    
    if (existingChallenges > 0) {
      console.log(`Found ${existingChallenges} existing challenges. Removing them before re-initialization.`);
      await Challenge.deleteMany({});
      console.log('Existing challenges removed.');
    }
    
    // Create only the challenges we want to keep (removing 'visit-team', 'update-profile', 'invite-friend')
    const selectedChallenges = [
      {
        id: 'daily-login',
        title: 'Daily Login',
        description: 'Log in to your account today',
        points: 1,
        type: 'daily',
        active: true
      }
      // You can add more challenges here if needed
    ];
    
    // Insert the selected challenges
    const result = await Challenge.insertMany(selectedChallenges);
    console.log(`${result.length} challenges initialized successfully.`);
    
    // List all active challenges
    const activeChallenges = await Challenge.find({ active: true });
    console.log('\nActive challenges:');
    activeChallenges.forEach(challenge => {
      console.log(`- ${challenge.title} (${challenge.points} points): ${challenge.description}`);
    });
    
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error initializing challenges:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
