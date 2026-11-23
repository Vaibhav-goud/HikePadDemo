const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const branches = await db.collection('sales_records').distinct('branch');
        console.log('Branches in sales_records:', branches);

        const userBranches = await db.collection('users').distinct('branch');
        console.log('Branches in users:', userBranches);
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}
run();
