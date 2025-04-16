const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Manually load environment variables since dotenv might not be working correctly
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = envContent.split('\n');

const env = {};
envVars.forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    env[parts[0].trim()] = parts[1].trim();
  }
});

// Set the database connection string
const DB_URI = env.DB_CONNECTION || 'mongodb://127.0.0.1:27017/my_database';

async function resetPassword() {
  try {
    // Connect to the database
    console.log("Connecting to database...");
    console.log(`Using connection string: ${DB_URI}`);
    await mongoose.connect(DB_URI);
    console.log("Connected to database");
    
    // Get the User model
    const User = require('./models/user');
    
    // The user email and new password
    const userEmail = "asdfg@gmail.com";
    const newPassword = "123456789";
    
    // Find the user
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.log(`User with email ${userEmail} not found.`);
      return;
    }
    
    console.log(`Found user: ${user.name} (${user.email})`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );
    
    console.log("Password has been reset successfully!");
    console.log(`New password for ${user.email} is: ${newPassword}`);
    console.log("You can now log in with this new password.");
    
  } catch (error) {
    console.error("Error resetting password:", error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

resetPassword();
