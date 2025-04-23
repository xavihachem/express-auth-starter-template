/**
 * Script to list all users in the database for testing purposes
 * This is a development tool and should not be used in production
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/express-auth-starter')
    .then(() => console.log('Connected to database'))
    .catch(err => {
        console.error('Database connection error:', err);
        process.exit(1);
    });

async function listUsers() {
    try {
        const users = await User.find({}).select('name email completedChallenges challengePoints');
        
        if (!users || users.length === 0) {
            console.log('No users found in the database');
            return;
        }
        
        console.log(`Found ${users.length} users:`);
        users.forEach((user, index) => {
            console.log(`\n[User ${index + 1}]`);
            console.log(`Name: ${user.name}`);
            console.log(`Email: ${user.email}`);
            console.log(`Completed Challenges: ${JSON.stringify(user.completedChallenges || [])}`);
            console.log(`Challenge Points: ${user.challengePoints || 0}`);
        });
    } catch (err) {
        console.error('Error listing users:', err);
    } finally {
        mongoose.disconnect();
    }
}

// Run the list function
listUsers()
    .then(() => {
        console.log('\nUser listing complete!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error in listing process:', err);
        process.exit(1);
    });
