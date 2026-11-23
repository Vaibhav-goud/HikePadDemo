const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function debugJanDiscrepancy() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('MUM-ADM');

        const janStart = new Date('2026-01-01T00:00:00Z');
        const janEnd = new Date('2026-01-31T23:59:59Z');

        // Get all Jan records
        const records = await collection.find({
            registrationType: 'Admissions',
            admissionDate: { $gte: janStart, $lte: janEnd }
        }).toArray();

        console.log(`Total Jan Records: ${records.length}`);

        // Check for specific BDE mismatches or missing names
        const bdeGroups = {};
        records.forEach(r => {
            const name = r.bdeName || 'EMPTY';
            bdeGroups[name] = (bdeGroups[name] || 0) + 1;
        });

        console.log('BDE Groups (Jan):', JSON.stringify(bdeGroups, null, 2));

        // Check for records that might be missed in the aggregation due to name normalization
        const missingNorm = records.filter(r => !r.bdeNameNormalized).length;
        console.log(`Records missing bdeNameNormalized: ${missingNorm}`);

        // Are there any "Admissions" that are actually "Registration" in the data but user thinks they are admissions?
        // Or vice versa?

    } finally {
        await client.close();
    }
}

debugJanDiscrepancy();
