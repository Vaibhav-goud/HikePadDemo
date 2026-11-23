const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('HYD-ADM');

        const records = await collection.find({
            registrationType: 'Admissions',
            admissionDate: {
                $gte: new Date('2025-12-30'),
                $lte: new Date('2026-01-05')
            }
        }).toArray();

        console.log('Transition Records:');
        records.forEach(r => {
            console.log(`${r.regNo} | ${r.candidateName} | UTC: ${r.admissionDate.toISOString()}`);
        });

    } finally {
        await client.close();
    }
}
run();
