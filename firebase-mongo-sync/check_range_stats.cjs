const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function checkRangeStats() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');

        const start = new Date('2025-11-01T00:00:00Z');
        const end = new Date('2026-02-28T23:59:59Z');

        const pipeline = [
            {
                $match: {
                    registrationType: 'Admissions',
                    admissionDate: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: "$branch",
                    count: { $sum: 1 },
                    revenue: { $sum: "$amount" }
                }
            }
        ];

        console.log('Stats for Nov 1, 2025 - Feb 28, 2026:');
        const hyd = await db.collection('HYD-ADM').aggregate(pipeline).toArray();
        const mum = await db.collection('MUM-ADM').aggregate(pipeline).toArray();

        hyd.forEach(r => console.log(`HYD: ${r.count} admissions, ₹${r.revenue}`));
        mum.forEach(r => console.log(`MUM: ${r.count} admissions, ₹${r.revenue}`));

    } finally {
        await client.close();
    }
}

checkRangeStats();
