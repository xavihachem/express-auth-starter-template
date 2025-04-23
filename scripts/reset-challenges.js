/**
 * Script to reset the "start-investing" challenge for all users
 * Uses direct MongoDB connection
 */
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection details
const uri = 'mongodb://127.0.0.1:27017';
const dbName = 'my_database';
const collectionName = 'users';

async function resetStartInvestingChallenge() {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Connected successfully to MongoDB');
        
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        
        // Find users with 'start-investing' in their completedChallenges array
        const usersWithChallenge = await collection.find({
            'completedChallenges': 'start-investing'
        }).toArray();
        
        console.log(`Found ${usersWithChallenge.length} users with completed 'start-investing' challenge`);
        
        if (usersWithChallenge.length === 0) {
            console.log('No users found with completed start-investing challenge');
            return;
        }
        
        // For each user, update to remove the challenge and subtract 2 points
        let successCount = 0;
        
        for (const user of usersWithChallenge) {
            console.log(`Resetting challenge for user: ${user.name || user.email || user._id}`);
            
            // Filter out 'start-investing' from completedChallenges
            const updatedChallenges = (user.completedChallenges || [])
                .filter(challenge => challenge !== 'start-investing');
            
            // Subtract 2 points (the points for this challenge)
            const currentPoints = user.challengePoints || 0;
            const updatedPoints = Math.max(0, currentPoints - 2);
            
            // Update the user
            const result = await collection.updateOne(
                { _id: user._id },
                { 
                    $set: { 
                        completedChallenges: updatedChallenges,
                        challengePoints: updatedPoints
                    } 
                }
            );
            
            if (result.modifiedCount === 1) {
                successCount++;
                console.log(`Successfully reset challenge for user ${user.name || user.email || user._id}`);
                console.log(`Points before: ${currentPoints}, Points after: ${updatedPoints}`);
            } else {
                console.log(`Failed to reset challenge for user ${user.name || user.email || user._id}`);
            }
        }
        
        console.log(`\nSummary: Reset challenges for ${successCount} out of ${usersWithChallenge.length} users`);
        
    } catch (err) {
        console.error('Error occurred:', err);
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}

// Run the reset function
resetStartInvestingChallenge()
    .then(() => console.log('Script execution completed'))
    .catch(err => console.error('Script execution failed:', err));
