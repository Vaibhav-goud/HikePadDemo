const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkAbhishekNames() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const salesCollection = db.collection('sales_records');

        const names = await salesCollection.distinct('bdeName', { bdeName: { $regex: /Abhishek/i } });
        console.log('BDE names including "Abhishek":', names);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkAbhishekNames();
