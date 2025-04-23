/**
 * Script to create a test user for development testing
 * This is a development tool and should not be used in production
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const bcrypt = require('bcryptjs');

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/express-auth-starter')
    .then(() => console.log('Connected to database'))
    .catch(err => {
        console.error('Database connection error:', err);
        process.exit(1);
    });

async function createTestUser() {
    try {
        // Check if test user already exists
        const existingUser = await User.findOne({ email: 'tester@example.com' });
        
        if (existingUser) {
            console.log('Test user already exists:');
            console.log(`Name: ${existingUser.name}`);
            console.log(`Email: ${existingUser.email}`);
            return;
        }
        
        // Create a password hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        
        // Create new test user
        const newUser = new User({
            name: 'Test User',
            email: 'tester@example.com',
            password: hashedPassword,
            role: 'user',
            verified: true,
            balance: 100,
            securitySettings: {
                twoFactorEnabled: false
            },
            completedChallenges: ['daily-login'],
            challengePoints: 1
        });
        
        await newUser.save();
        
        console.log('Test user created successfully:');
        console.log(`Name: ${newUser.name}`);
        console.log(`Email: ${newUser.email}`);
        console.log(`Password: password123 (hashed in database)`);
        console.log(`Completed Challenges: ${JSON.stringify(newUser.completedChallenges)}`);
        console.log(`Challenge Points: ${newUser.challengePoints}`);
    } catch (err) {
        console.error('Error creating test user:', err);
    } finally {
        mongoose.disconnect();
    }
}

// Run the creation function
createTestUser()
    .then(() => {
        console.log('\nTest user setup complete!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error in setup process:', err);
        process.exit(1);
    });
