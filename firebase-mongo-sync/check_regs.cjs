const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function checkRegistrationRecords() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('MUM-ADM');

        const samples = await collection.find({ registrationType: 'Registration' }).limit(5).toArray();
        console.log('Sample Registration Records (First 5):');
        samples.forEach((r, i) => {
            console.log(`\n--- Record ${i + 1} ---`);
            console.log(JSON.stringify(r, null, 2));
        });
    } finally {
        await client.close();
    }
}

checkRegistrationRecords();
