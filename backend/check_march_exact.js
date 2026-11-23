const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkMarchTheOne() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const salesCollection = db.collection('sales_records');

        const result = await salesCollection.findOne({ bdeName: 'Abhishek B', month: 'MARCH' });
        console.log('Month:', JSON.stringify(result.month));
        console.log('Branch:', JSON.stringify(result.branch));

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkMarchTheOne();
