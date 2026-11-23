const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function listDetails() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('HYD-ADM');

        const months = [
            { y: 2025, m: 11, label: 'Nov' },
            { y: 2025, m: 12, label: 'Dec' },
            { y: 2026, m: 2, label: 'Feb' }
        ];

        for (const month of months) {
            console.log(`\n--- ${month.label} ${month.y} ---`);
            const records = await collection.find({
                $expr: {
                    $and: [
                        { $eq: [{ $year: "$admissionDate" }, month.y] },
                        { $eq: [{ $month: "$admissionDate" }, month.m] }
                    ]
                }
            }).toArray();

            records.forEach(r => {
                const regDateStr = r.registrationDate ? r.registrationDate.toISOString().split('T')[0] : 'null';
                const admDateStr = r.admissionDate ? r.admissionDate.toISOString().split('T')[0] : 'null';
                console.log(`[${r.registrationType}] ${r.regNo} - ${r.candidateName} | REG: ${regDateStr} | ADM: ${admDateStr}`);
            });
        }

    } finally {
        await client.close();
    }
}

listDetails();
