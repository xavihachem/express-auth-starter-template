// Script to reset the admin password with direct database update
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
    
    // Email of the admin account to reset
    const adminEmail = 'admin@example.com';
    
    // New password to set
    const newPassword = '123456789';
    
    // Hash the password directly
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password directly in the database, bypassing any middleware
    const result = await db.collection('users').updateOne(
      { email: adminEmail },
      { $set: { password: hashedPassword } }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`Password reset successful for user: ${adminEmail}`);
      console.log(`New password is: ${newPassword}`);
      console.log(`Password hash: ${hashedPassword}`);
    } else {
      console.log(`User with email ${adminEmail} not found or password not changed`);
    }
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
    console.log('Database connection closed');
  }
});
