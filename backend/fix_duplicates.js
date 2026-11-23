require('dotenv').config();
const { connectToDB, getDB } = require('./mongo');
const { ObjectId } = require('mongodb');

async function fixDuplicates() {
    try {
        await connectToDB();
        const db = getDB();
        const usersCollection = db.collection('users');

        // Fix Ishtiyaque
        const ishtiyaqueUsers = await usersCollection.find({ name: 'Ishtiyaque' }).toArray();
        if (ishtiyaqueUsers.length > 1) {
            console.log(`Found ${ishtiyaqueUsers.length} users for 'Ishtiyaque'. Keeping the first one.`);

            // Keep the first one, delete the rest
            const toKeep = ishtiyaqueUsers[0];
            const toDelete = ishtiyaqueUsers.slice(1);

            console.log(`Keeping ID: ${toKeep._id}`);

            for (const u of toDelete) {
                console.log(`Deleting ID: ${u._id}`);
                await usersCollection.deleteOne({ _id: u._id });
            }
            console.log('Fixed Ishtiyaque duplicates.');
        } else {
            console.log('Ishtiyaque has no duplicates.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

fixDuplicates();
