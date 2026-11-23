const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function checkDecMumbai() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('MUM-ADM');

        const decStart = new Date('2025-12-01T00:00:00Z');
        const decEnd = new Date('2025-12-31T23:59:59Z');

        const query = {
            registrationType: 'Admissions',
            admissionDate: { $gte: decStart, $lte: decEnd }
        };

        const count = await collection.countDocuments(query);
        console.log(`MongoDB Dec 2025 Mumbai Admissions: ${count}`);

        // Check for records with "Admission" (singular)
        const singular = await collection.countDocuments({
            registrationType: 'Admission',
            admissionDate: { $gte: decStart, $lte: decEnd }
        });
        console.log(`Singular "Admission" records in Dec: ${singular}`);

        // Check for records that might be on the edge (e.g. Jan 1st midnight IST)
        const edgeQuery = {
            registrationType: 'Admissions',
            admissionDate: {
                $gte: new Date('2026-01-01T00:00:00Z'),
                $lt: new Date('2026-01-01T06:30:00Z') // 6:30 AM UTC is midnight IST
            }
        };
        const edgeCount = await collection.countDocuments(edgeQuery);
        console.log(`Records between Jan 1st 00:00 UTC and 06:30 UTC: ${edgeCount}`);

    } finally {
        await client.close();
    }
}

checkDecMumbai();
