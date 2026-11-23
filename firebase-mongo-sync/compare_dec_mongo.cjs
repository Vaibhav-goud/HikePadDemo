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
            $expr: {
                $and: [
                    { $eq: [{ $year: "$admissionDate" }, 2025] },
                    { $eq: [{ $month: "$admissionDate" }, 12] }
                ]
            }
        }).toArray();

        console.log(`Mongo Dec 2025 Admissions (${records.length}):`);
        records.sort((a, b) => String(a.regNo).localeCompare(String(b.regNo))).forEach(r => {
            console.log(`  - ${r.regNo} | ${r.candidateName}`);
        });

    } finally {
        await client.close();
    }
}
run();
