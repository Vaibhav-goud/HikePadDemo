require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const users = await db.collection('users').find({
            role: { $in: ['Team Leader', 'Proposed Team Leader (PTL)', 'Assistant Team Leader (ATL)', 'Proposed Assistant Team Leader (PATL)'] }
        }).toArray();

        console.log('--- USERS ---');
        console.log(JSON.stringify(users.map(u => ({
            name: u.name,
            role: u.role,
            assignedAtls: u.assignedAtls || [],
            inactive: !!u.inactive,
            branch: u.branch
        })), null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

run();
