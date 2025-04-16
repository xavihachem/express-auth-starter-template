// Script to reset the admin password
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
    
    // Email of the admin account to reset
    const adminEmail = 'admin@example.com';
    
    // New password to set
    const newPassword = '123456789';
    
    // Find the admin user
    const adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.log(`User with email ${adminEmail} not found`);
      mongoose.connection.close();
      return;
    }
    
    // Use the new changePassword method
    const result = await User.changePassword(adminUser._id, newPassword);
    
    if (result) {
      console.log(`Password reset successful for user: ${result.email}`);
      console.log(`New password is: ${newPassword}`);
    } else {
      console.log(`User with email ${adminEmail} not found`);
    }
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
    console.log('Database connection closed');
  }
});
