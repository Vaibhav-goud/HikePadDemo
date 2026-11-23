const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkBoundaryData() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const mumColl = db.collection('MUM-ADM');

        // Records on Jan 31st or early Feb 1st
        const janFebBoundary = await mumColl.find({
            admissionDate: {
                $gte: new Date('2026-01-31T00:00:00.000Z'),
                $lte: new Date('2026-02-01T12:00:00.000Z')
            }
        }).toArray();

        // Records on Feb 28th or early Mar 1st
        const febMarBoundary = await mumColl.find({
            admissionDate: {
                $gte: new Date('2026-02-28T00:00:00.000Z'),
                $lte: new Date('2026-03-01T12:00:00.000Z')
            }
        }).toArray();

        console.log('Jan/Feb Boundary Records:');
        janFebBoundary.forEach(r => console.log(`${r.regNo} - ${r.admissionDate.toISOString()}`));

        console.log('\nFeb/Mar Boundary Records:');
        febMarBoundary.forEach(r => console.log(`${r.regNo} - ${r.admissionDate.toISOString()}`));

    } finally {
        await client.close();
    }
}

checkBoundaryData();
