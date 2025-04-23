/**
 * Script to directly reset user challenges using raw MongoDB operations
 */

const mongoose = require('mongoose');

// Connect to the database
mongoose.connect('mongodb://localhost:27017/auth')
  .then(() => {
    console.log('Connected to database');
    resetUserChallenges();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

async function resetUserChallenges() {
  try {
    // Get direct access to the database
    const db = mongoose.connection.db;
    
    // Find all users and log their details for debugging
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users in the database`);
    
    if (users.length > 0) {
      // Display some info about the first user to verify we're looking at the right collection
      console.log(`First user: ${users[0].name}, Email: ${users[0].email}`);
      console.log(`Completed challenges: ${JSON.stringify(users[0].completedChallenges || [])}`);
    }
    
    // Reset completed challenges for all users directly using the MongoDB driver
    const result = await db.collection('users').updateMany(
      {}, // match all documents
      { $set: { completedChallenges: [] } } // set to empty array
    );
    
    console.log(`Updated ${result.modifiedCount} users to reset their completed challenges`);
    
    // Reset lastChallengeReset date to force challenges to be available again
    const now = new Date();
    now.setDate(now.getDate() - 1); // Set to yesterday
    
    const dateResult = await db.collection('users').updateMany(
      {},
      { $set: { lastChallengeReset: now } }
    );
    
    console.log(`Updated lastChallengeReset for ${dateResult.modifiedCount} users`);
    
    mongoose.connection.close();
    console.log('Database connection closed');
    console.log('\nNOTE: You may need to restart the server for changes to take effect.');
  } catch (error) {
    console.error('Error resetting user challenges:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
