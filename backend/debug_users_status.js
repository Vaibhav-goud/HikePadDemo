require('dotenv').config();
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('users');

        const names = ["Gaganam Mohan", "Zohra Baig", "Gulafsha"];

        for (const name of names) {
            console.log(`\nChecking user: ${name}...`);
            const user = await collection.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            });

            if (user) {
                console.log(`Name: ${user.name} | Role: ${user.role} | Branch: ${user.branch} | Inactive: ${user.inactive || false}`);
            } else {
                console.log('User not found in users collection.');
            }
        }

    } finally {
        await client.close();
    }
}
run().catch(console.dir);
