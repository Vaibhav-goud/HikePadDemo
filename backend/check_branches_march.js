const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkBranches() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const salesCollection = db.collection('sales_records');

        const branches = await salesCollection.distinct('branch', { month: 'MARCH' });
        console.log('Branches in March:', branches);

        const counts = {};
        for (const b of branches) {
            counts[b] = await salesCollection.countDocuments({ branch: b, month: 'MARCH' });
        }
        console.log('Counts per branch in March:', counts);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkBranches();
