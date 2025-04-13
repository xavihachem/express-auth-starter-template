// Script to create an admin user
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
const bcrypt = require('bcrypt');

// Connect to the database
mongoose.connect(process.env.DB_CONNECTION)
    .then(() => console.log('Connected to database for admin creation'))
    .catch(err => console.log('Error connecting to database:', err));

// Admin user details
const adminUser = {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123', // This will be hashed before saving
    role: 'admin'
};

async function createAdminUser() {
    try {
        // Check if admin user already exists
        const existingAdmin = await User.findOne({ email: adminUser.email });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(adminUser.password, 10);

        // Create the admin user
        const newAdmin = await User.create({
            name: adminUser.name,
            email: adminUser.email,
            password: hashedPassword,
            role: adminUser.role
        });

        console.log('Admin user created successfully');
        console.log('Email:', adminUser.email);
        console.log('Password:', adminUser.password);
        console.log('Role:', adminUser.role);
        process.exit(0);
    } catch (err) {
        console.error('Error creating admin user:', err);
        process.exit(1);
    }
}

// Run the function
createAdminUser();
