const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugAbhinav() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        
        console.log('--- DRIVES ---');
        const drives = await db.collection('drives').find({}).toArray();
        console.log(JSON.stringify(drives, null, 2));

        console.log('\n--- ABHINAV RECORDS ---');
        const records = await db.collection('sales_records').find({ bdeName: 'Abhinav' }).toArray();
        console.log(JSON.stringify(records, null, 2));

    } finally {
        await client.close();
    }
}

debugAbhinav();
