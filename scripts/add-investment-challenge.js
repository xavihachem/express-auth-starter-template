/**
 * Script to add a new "Start Investing" challenge
 */

const mongoose = require('mongoose');
const Challenge = require('../models/challenge');

// Connect to the database
mongoose.connect('mongodb://localhost:27017/auth')
  .then(() => {
    console.log('Connected to database');
    addInvestmentChallenge();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

async function addInvestmentChallenge() {
  try {
    // Define the new challenge
    const investmentChallenge = {
      id: 'start-investing',
      title: 'Start Investing',
      description: 'Visit the investments page and start your first investment',
      points: 5,  // Higher points as this is a more valuable action
      type: 'daily',
      active: true
    };
    
    // Check if this challenge already exists
    const existingChallenge = await Challenge.findOne({ id: 'start-investing' });
    
    if (existingChallenge) {
      console.log('Start Investing challenge already exists. Updating it...');
      // Update the existing challenge
      await Challenge.updateOne(
        { id: 'start-investing' },
        { 
          $set: {
            title: investmentChallenge.title,
            description: investmentChallenge.description,
            points: investmentChallenge.points,
            active: true // Make sure it's active
          }
        }
      );
      console.log('Challenge updated successfully');
    } else {
      // Create the new challenge
      await Challenge.create(investmentChallenge);
      console.log('Start Investing challenge created successfully');
    }
    
    // List all active challenges
    const activeChalllenges = await Challenge.find({ active: true });
    console.log('\nCurrent active challenges:');
    activeChalllenges.forEach(challenge => {
      console.log(`- ${challenge.title} (${challenge.points} points): ${challenge.description}`);
    });
    
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error adding investment challenge:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
