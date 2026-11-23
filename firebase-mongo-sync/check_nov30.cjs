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
                $gte: new Date('2025-11-29T12:00:00Z'),
                $lte: new Date('2025-11-30T12:00:00Z')
            }
        }).toArray();

        console.log(`Records around Nov 30th 00:00 to 12:00 UTC (Nov 30th IST):`);
        records.forEach(r => {
            const date = r.admissionDate;
            const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
            console.log(`${r.regNo} | ${r.candidateName} | UTC: ${date.toISOString()} | IST: ${istDate.toISOString()}`);
        });

    } finally {
        await client.close();
    }
}
run();
