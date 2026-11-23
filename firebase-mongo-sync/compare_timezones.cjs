const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('HYD-ADM');

        // Find all admissions from Nov to Feb
        const records = await collection.find({
            registrationType: 'Admissions',
            admissionDate: {
                $gte: new Date('2025-10-01'),
                $lte: new Date('2026-03-31')
            }
        }).toArray();

        console.log(`Total Admissions found: ${records.length}`);

        const counts = {};
        records.forEach(r => {
            // UTC Month/Year
            const utcKey = `${r.admissionDate.getUTCFullYear()}-${r.admissionDate.getUTCMonth() + 1}`;
            counts[utcKey] = counts[utcKey] || { utc: 0, ist: 0 };
            counts[utcKey].utc++;

            // IST Month/Year (approximate)
            const istDate = new Date(r.admissionDate.getTime() + (5.5 * 60 * 60 * 1000));
            const istKey = `${istDate.getUTCFullYear()}-${istDate.getUTCMonth() + 1}`;
            counts[istKey] = counts[istKey] || { utc: 0, ist: 0 };
            counts[istKey].ist++;
        });

        console.table(counts);

    } finally {
        await client.close();
    }
}
run();
