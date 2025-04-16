require('dotenv').config(); // Use default path resolution
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/user'); // Adjust path if necessary

const NEW_PASSWORD = '123456789'; // The password you requested

async function resetAllPasswords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DB_CONNECTION, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to database!');

    // Hash the new password
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
    console.log(`Hashing new password: ${NEW_PASSWORD}`);

    // Update all users
    console.log('Attempting to update all user passwords...');
    const updateResult = await User.updateMany({}, { $set: { password: hashedPassword } });

    if (updateResult.acknowledged) {
      console.log(`Successfully updated passwords for ${updateResult.modifiedCount} users.`);
      if (updateResult.matchedCount !== updateResult.modifiedCount) {
         console.warn(`Note: ${updateResult.matchedCount} users were matched, but only ${updateResult.modifiedCount} were modified. This might happen if some users already had this password.`);
      }
    } else {
      console.error('Password update operation was not acknowledged by the server.');
    }

  } catch (error) {
    console.error('Error resetting passwords:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

resetAllPasswords();
