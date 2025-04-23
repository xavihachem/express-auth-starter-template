/**
 * Script to directly fix the challenges in the database
 * This script will remove all old challenges and create only the ones we want
 */

const mongoose = require('mongoose');

// Connect to the database
mongoose.connect('mongodb://localhost:27017/auth')
  .then(() => {
    console.log('Connected to database');
    fixChallenges();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

async function fixChallenges() {
  try {
    // Get direct access to the database
    const db = mongoose.connection.db;
    const challengesCollection = db.collection('challenges');
    
    // 1. First, let's see what challenges currently exist
    const existingChallenges = await challengesCollection.find({}).toArray();
    console.log(`Found ${existingChallenges.length} existing challenges:`);
    existingChallenges.forEach(challenge => {
      console.log(`- ID: ${challenge.id}, Title: ${challenge.title}, Active: ${challenge.active}`);
    });
    
    // 2. Remove ALL existing challenges
    console.log('\nRemoving all existing challenges...');
    await challengesCollection.deleteMany({});
    console.log('All challenges removed');
    
    // 3. Create exactly the challenges we want
    const newChallenges = [
      {
        id: 'daily-login',
        title: 'Daily Login',
        description: 'Log in to your account today',
        points: 1,
        type: 'daily',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'start-investing',
        title: 'Start Investing',
        description: 'Visit the investments page and start your first investment',
        points: 2,
        type: 'daily',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    console.log('\nCreating new challenges:');
    newChallenges.forEach(challenge => {
      console.log(`- ${challenge.title} (${challenge.points} points)`);
    });
    
    await challengesCollection.insertMany(newChallenges);
    console.log('New challenges created successfully');
    
    // 4. Verify the final state
    const finalChallenges = await challengesCollection.find({}).toArray();
    console.log('\nFinal state of challenges in database:');
    finalChallenges.forEach(challenge => {
      console.log(`- ${challenge.title} (${challenge.points} points): ${challenge.description}`);
    });
    
    mongoose.connection.close();
    console.log('\nDatabase connection closed');
    console.log('NOTE: You need to restart the server for changes to take effect.');
  } catch (error) {
    console.error('Error fixing challenges:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
