/**
 * Script to create only the two challenges we want
 */

const mongoose = require('mongoose');
const Challenge = require('../models/challenge');

// Connect to the database
mongoose.connect('mongodb://localhost:27017/auth')
  .then(() => {
    console.log('Connected to database');
    createChallenges();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

async function createChallenges() {
  try {
    // First, delete any existing challenges
    await Challenge.deleteMany({});
    console.log('Removed all existing challenges');
    
    // Create the new challenges
    const challenges = [
      {
        id: 'daily-login',
        title: 'Daily Login',
        description: 'Log in to your account today',
        points: 1,
        type: 'daily',
        active: true
      },
      {
        id: 'start-investing',
        title: 'Start Investing',
        description: 'Visit the investments page and start your first investment',
        points: 2,
        type: 'daily',
        active: true
      }
    ];
    
    // Insert the challenges
    await Challenge.insertMany(challenges);
    console.log('Created new challenges successfully');
    
    // Verify
    const activeChallenges = await Challenge.find({ active: true });
    console.log('\nActive challenges in database:');
    activeChallenges.forEach(challenge => {
      console.log(`- ${challenge.title} (${challenge.points} points): ${challenge.description}`);
    });
    
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error creating challenges:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
