const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('dotenv').config();

// The stored hash from your database
const storedHash = "$2b$10$mqQ7sFgqzIp9.JmtbNYXqOuVnFN8MEMg.l4Fx7tDlmCYDawyWpTfm";
const testPassword = "123456789";

// Test if the password matches the hash
async function testPasswordMatch() {
  console.log(`Testing if password "${testPassword}" matches the stored hash...`);
  
  const isMatch = await bcrypt.compare(testPassword, storedHash);
  
  if (isMatch) {
    console.log("✅ Password matches! The login issue is not related to password verification.");
  } else {
    console.log("❌ Password does NOT match. This explains the login failure.");
  }
}

// Connect to database and test a real login
async function testRealLogin() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database");
    
    // Get the User model
    const User = require('./models/user');
    
    // Find the user by email
    const email = "asdfg@gmail.com";
    console.log(`Looking for user with email: ${email}`);
    
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log("❌ User not found in database. This explains the login failure.");
      return;
    }
    
    console.log("✅ User found in database");
    console.log(`User ID: ${user._id}`);
    console.log(`User name: ${user.name}`);
    
    // Test password match
    const loginPassword = "123456789";
    console.log(`Testing if login password "${loginPassword}" matches user's stored password...`);
    
    const passwordMatch = await bcrypt.compare(loginPassword, user.password);
    
    if (passwordMatch) {
      console.log("✅ Password matches! The user should be able to log in.");
    } else {
      console.log("❌ Password does NOT match. This explains the login failure.");
    }
    
  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

// Run both tests
async function runTests() {
  console.log("=== TESTING HASH DIRECTLY ===");
  await testPasswordMatch();
  
  console.log("\n=== TESTING ACTUAL DATABASE LOGIN ===");
  await testRealLogin();
}

runTests();
