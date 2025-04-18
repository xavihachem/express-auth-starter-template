// Script to update a user's password
const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.DB_CONNECTION)
  .then(() => console.log('Connected to database for password update'))
  .catch(err => console.error('Error connecting to database:', err));

async function updatePassword() {
  try {
    // Replace with the email of the account you want to update
    const email = 'xavihachem2@gmail.com';
    
    // Simple password for testing - you should change this later
    const newPassword = '$2b$10$pKjJ6y.paUotEFShBpQn6.1UY6sLM8a1ESvbqy/Ag3vzL7n7ttZV.';
    
    // Update the user's password
    const result = await User.findOneAndUpdate(
      { email: email },
      { password: newPassword },
      { new: true }
    );
    
    if (result) {
      console.log('Password updated successfully for user:', result.email);
    } else {
      console.log('User not found with email:', email);
    }
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
updatePassword();
