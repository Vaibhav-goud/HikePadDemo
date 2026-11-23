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
            $expr: {
                $and: [
                    { $eq: [{ $year: { date: "$admissionDate", timezone: "Asia/Kolkata" } }, 2025] },
                    { $eq: [{ $month: { date: "$admissionDate", timezone: "Asia/Kolkata" } }, 12] }
                ]
            },
            registrationType: { $type: "string", $nin: ["", " "] }
        }).toArray();

        console.log(`Found ${records.length} records in Dec 2025 (IST)`);
        records.sort((a, b) => a.admissionDate - b.admissionDate).forEach(r => {
            console.log(`${r.regNo} | ${r.candidateName} | Type: ${r.registrationType} | ADM Date: ${r.admissionDate.toISOString()}`);
        });

    } finally {
        await client.close();
    }
}
run();
