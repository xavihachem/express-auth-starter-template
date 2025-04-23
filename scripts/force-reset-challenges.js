/**
 * Script to force reset all completed challenges
 * This clears the completedChallenges array for all users
 */

const mongoose = require('mongoose');

// Connect to the database
mongoose.connect('mongodb://localhost:27017/auth')
  .then(() => {
    console.log('Connected to database');
    resetAllCompletedChallenges();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

async function resetAllCompletedChallenges() {
  try {
    const db = mongoose.connection;
    
    // Direct database operation to update all users
    // This is more reliable than using the model when we're having issues
    const result = await db.collection('users').updateMany(
      {}, // match all users
      { $set: { completedChallenges: [] } } // clear the array
    );
    
    console.log(`Updated ${result.modifiedCount} users`);
    console.log('All completed challenges have been reset');
    
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error resetting challenges:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
