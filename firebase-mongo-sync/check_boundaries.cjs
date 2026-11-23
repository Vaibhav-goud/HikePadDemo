const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('HYD-ADM');

        const boundaries = [
            { label: 'Nov-Dec Boundary', start: '2025-11-28', end: '2025-12-03' },
            { label: 'Dec-Jan Boundary', start: '2025-12-28', end: '2026-01-03' }
        ];

        for (const b of boundaries) {
            console.log(`\n--- ${b.label} ---`);
            const records = await collection.find({
                registrationType: 'Admissions',
                admissionDate: {
                    $gte: new Date(b.start),
                    $lte: new Date(b.end)
                }
            }).toArray();

            records.forEach(r => {
                const date = r.admissionDate;
                const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                console.log(`${r.regNo} | ${r.candidateName} | UTC: ${date.toISOString()} | IST: ${istDate.toISOString()}`);
            });
        }

    } finally {
        await client.close();
    }
}
run();
