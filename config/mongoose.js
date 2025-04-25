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
    console.log('MongoDB connection attempt...');
    mongoose
        .connect(process.env.DB_CONNECTION, connectOptions)
        .catch(err => {
            console.error('MongoDB connection error:', err.message);
            console.log('Retrying MongoDB connection in 5 seconds...');
            setTimeout(connectWithRetry, 5000);
        });
};

// Initial connection
connectWithRetry();

// Acquire the connection
const db = mongoose.connection;

// In case of error
db.on('error', (err) => {
    console.error('MongoDB error event:', err.message);
});

// If connection is disconnected
db.on('disconnected', () => {
    console.log('MongoDB disconnected, attempting to reconnect...');
});

// If db up and running print this msg (once)
db.once('open', function () {
    console.log('Connected to database!');
});
