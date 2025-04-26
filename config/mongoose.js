// require the env file
require('dotenv').config();

// require the library
const mongoose = require('mongoose');

// Connection options with retry logic
const connectOptions = {
    serverSelectionTimeoutMS: 30000, // Timeout after 30 seconds instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45 seconds
    heartbeatFrequencyMS: 5000, // Check connection every 5 seconds
    retryWrites: true,
    maxPoolSize: 10, // Maintain up to 10 socket connections
};

// Connect with retry logic
const connectWithRetry = () => {
    // Check if DB_CONNECTION is defined
    if (!process.env.DB_CONNECTION) {
        console.warn('⚠️ DB_CONNECTION environment variable is not defined!');
        console.warn('⚠️ No database connection will be established.');
        console.warn('⚠️ Application will run with limited functionality.');
        return; // Exit function without attempting connection
    }
    
    // Attempting MongoDB connection
    mongoose
        .connect(process.env.DB_CONNECTION, connectOptions)
        .catch(err => {
            // Silent error handling for MongoDB connection issues
            setTimeout(connectWithRetry, 5000);
        });
};

// Initial connection
connectWithRetry();

// Acquire the connection
const db = mongoose.connection;

// In case of error
db.on('error', (err) => {
    // Handle MongoDB error event silently
});

// If connection is disconnected
db.on('disconnected', () => {
    // Handle MongoDB disconnection silently
});

// If db up and running print this msg (once)
db.once('open', function () {
    // Successfully connected to database
});
