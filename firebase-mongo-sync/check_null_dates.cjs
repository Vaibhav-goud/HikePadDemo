const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function checkNullDates() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('MUM-ADM');

        const nullDates = await collection.countDocuments({ admissionDate: null });
        console.log(`Total records with null admissionDate: ${nullDates}`);

        const sample = await collection.find({ admissionDate: null }).limit(10).toArray();
        console.log('Sample records with null admissionDate:');
        sample.forEach(r => {
            console.log(`- RegNo: ${r.regNo}, BDE: ${r.bdeName}, last_synced: ${r.last_synced}`);
        });

        if (sample.length > 0) {
            console.log('Full sample record (first):', JSON.stringify(sample[0], null, 2));
        }

        const allRecords = await collection.countDocuments({});
        console.log(`Total records in MUM-ADM: ${allRecords}`);

    } finally {
        await client.close();
    }
}

checkNullDates();
