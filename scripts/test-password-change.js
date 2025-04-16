// Script to test password change functionality
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
    
    // Email of the admin account to test
    const adminEmail = 'admin@example.com';
    
    // Step 1: Change the password to a new value
    const newPassword = 'TestPassword123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('Step 1: Changing admin password...');
    const updateResult = await db.collection('users').updateOne(
      { email: adminEmail },
      { $set: { password: hashedPassword } }
    );
    
    if (updateResult.modifiedCount === 0) {
      console.log(`Failed to update password for ${adminEmail}`);
      mongoose.connection.close();
      return;
    }
    
    console.log(`Password changed to: ${newPassword}`);
    console.log(`Password hash: ${hashedPassword}`);
    
    // Step 2: Verify the password is properly stored in the database
    console.log('\nStep 2: Verifying password in database...');
    const user = await db.collection('users').findOne({ email: adminEmail });
    
    if (!user) {
      console.log(`User ${adminEmail} not found in database`);
      mongoose.connection.close();
      return;
    }
    
    console.log(`Password in database: ${user.password}`);
    console.log(`Is password hashed: ${user.password.startsWith('$2')}`);
    
    // Step 3: Test login with the new password
    console.log('\nStep 3: Testing login with new password...');
    const isPasswordValid = await bcrypt.compare(newPassword, user.password);
    console.log(`Login successful: ${isPasswordValid}`);
    
    if (isPasswordValid) {
      console.log('\n✅ TEST PASSED: Password change functionality is working correctly!');
      console.log(`You can now log in with:`);
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${newPassword}`);
    } else {
      console.log('\n❌ TEST FAILED: Password verification failed!');
    }
    
  } catch (error) {
    console.error('Error testing password change:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
});
