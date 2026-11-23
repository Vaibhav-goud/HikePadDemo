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

        const name = "Bayana Rakesh";
        const branch = "Hyderabad Branch";
        const inactive = true;

        console.log(`Setting ${name} to inactive: ${inactive}...`);

        // Emulate the backend logic
        const user = await users.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            branch: branch
        });

        if (!user) {
            console.log('User not found!');
            return;
        }

        console.log('Found user:', user.name);

        const result = await users.updateOne(
            { _id: user._id },
            { $set: { inactive: inactive } }
        );

        console.log('Update result:', result);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}
run();
