const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const users = db.collection('users');

        const searchName = "Bayana Rakesh";
        console.log(`\n--- ALL USER RECORDS FOR: ${searchName} ---\n`);

        const allUserRecords = await users.find({
            name: { $regex: new RegExp(searchName, 'i') }
        }).toArray();

        if (allUserRecords.length > 0) {
            allUserRecords.forEach(u => {
                console.log(`ID: ${u._id} | Name: "${u.name}" | Branch: "${u.branch}" | Inactive: ${u.inactive}`);
            });
        } else {
            console.log('No records found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}
run();
