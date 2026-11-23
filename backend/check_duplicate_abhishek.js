const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkDuplicateUsers() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const usersCollection = db.collection('users');

        console.log('--- Searching for all users named "Abhishek B" ---');
        const users = await usersCollection.find({ name: 'Abhishek B' }).toArray();
        
        if (users.length > 0) {
            console.log(`Found ${users.length} users:`);
            users.forEach((u, i) => {
                console.log(`${i+1}. Branch: ${u.branch}, Inactive: ${u.inactive}, ID: ${u._id}`);
            });
        } else {
            console.log('No users found with name "Abhishek B"');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkDuplicateUsers();
