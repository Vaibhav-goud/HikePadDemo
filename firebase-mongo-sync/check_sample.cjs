const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function checkSample() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        console.log('Connecting...');
        await client.connect();
        console.log('Searching...');
        const db = client.db('hike_dashboard_db');
        const rec = await db.collection('MUM-ADM').findOne({});
        if (rec) {
            console.log('Found record');
            console.log('Amount:', rec.amount, typeof rec.amount);
        } else {
            console.log('No record found');
        }
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await client.close();
    }
}

checkSample();
