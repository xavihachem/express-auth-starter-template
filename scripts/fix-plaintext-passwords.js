// Script to fix plaintext passwords in the database
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Connect to the database
mongoose.connect(process.env.DB_CONNECTION);
const db = mongoose.connection;

db.on('error', (error) => {
  console.error('Database connection error:', error);
  process.exit(1);
});

db.once('open', async () => {
  try {
    console.log('Connected to database');
    
    // Import the User model
    const User = require('../models/user');
    
    // Find all users
    const users = await User.find().select('+password');
    let fixedCount = 0;
    
    console.log(`Found ${users.length} users in the database`);
    
    // Process each user
    for (const user of users) {
      // Check if the password looks like a hash (bcrypt hashes start with $2a$, $2b$, or $2y$)
      if (!user.password.startsWith('$2')) {
        console.log(`Fixing password for user: ${user.email}`);
        
        // Hash the plaintext password
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // Update the user's password directly to avoid triggering hooks
        await User.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
        
        fixedCount++;
      }
    }
    
    console.log(`Fixed ${fixedCount} plaintext passwords in the database`);
    
  } catch (error) {
    console.error('Error fixing passwords:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
    console.log('Database connection closed');
  }
});
