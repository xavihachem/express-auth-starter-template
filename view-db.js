// Simple script to list MongoDB collections and document counts
require('dotenv').config();
const mongoose = require('mongoose');

async function listCollections() {
  try {
    // Connect to MongoDB
    console.log('Connecting to database...');
    await mongoose.connect(process.env.DB_CONNECTION);
    console.log('Connected to MongoDB at: ' + process.env.DB_CONNECTION);
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('\nNo collections found. The database is empty.');
    } else {
      console.log(`\nFound ${collections.length} collection(s) in the database:`);
      console.log('============================================');
      
      // Process each collection
      for (const collection of collections) {
        const name = collection.name;
        const count = await mongoose.connection.db.collection(name).countDocuments();
        console.log(`- ${name}: ${count} document(s)`);
      }
      
      console.log('\nTo view specific collections, you can use:');
      console.log('1. MongoDB Compass (GUI tool)');
      console.log('2. Install MongoDB Shell (mongosh)');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Close connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

// Run the function
listCollections();
