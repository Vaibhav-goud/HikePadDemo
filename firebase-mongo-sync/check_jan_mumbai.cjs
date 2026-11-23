const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function checkJanMumbai() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('MUM-ADM');

        const janStart = new Date('2026-01-01T00:00:00Z');
        const janEnd = new Date('2026-01-31T23:59:59Z');

        const query = {
            registrationType: 'Admissions',
            admissionDate: { $gte: janStart, $lte: janEnd }
        };

        const count = await collection.countDocuments(query);
        console.log(`MongoDB Jan 2026 Mumbai Admissions: ${count}`);

        // Check for records that might be on the edge (e.g. Feb 1st midnight IST)
        const edgeQuery = {
            registrationType: 'Admissions',
            admissionDate: {
                $gte: new Date('2026-02-01T00:00:00Z'),
                $lt: new Date('2026-02-01T06:30:00Z') // 6:30 AM UTC is midnight IST
            }
        };
        const edgeCount = await collection.countDocuments(edgeQuery);
        console.log(`Records between Feb 1st 00:00 UTC and 06:30 UTC: ${edgeCount}`);

        // Check the other edge (Dec 31st/Jan 1st)
        const decEdgeQuery = {
            registrationType: 'Admissions',
            admissionDate: {
                $gte: new Date('2025-12-31T18:30:00Z'), // Midnight IST Jan 1st
                $lt: new Date('2026-01-01T00:00:00Z')
            }
        };
        const decEdgeCount = await collection.countDocuments(decEdgeQuery);
        console.log(`Records between Dec 31st 18:30 UTC and Jan 1st 00:00 UTC: ${decEdgeCount}`);

        // Let's also check if any "Registration" records in Jan should be Admissions
        const regCount = await db.collection('MUM-ADM').countDocuments({
            registrationType: 'Registration',
            admissionDate: { $gte: janStart, $lte: janEnd }
        });
        console.log(`Registration records in Jan 2026: ${regCount}`);

    } finally {
        await client.close();
    }
}

checkJanMumbai();
