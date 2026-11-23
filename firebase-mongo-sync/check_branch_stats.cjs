const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function checkBranchStats() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');

        const febStart = new Date('2026-02-01T00:00:00Z');
        const febEnd = new Date('2026-02-28T23:59:59Z');

        const branches = ['HYD-ADM', 'MUM-ADM'];

        for (const col of branches) {
            const count = await db.collection(col).countDocuments({
                registrationType: 'Admissions',
                admissionDate: { $gte: febStart, $lte: febEnd }
            });

            const revenueAgg = await db.collection(col).aggregate([
                {
                    $match: {
                        registrationType: 'Admissions',
                        admissionDate: { $gte: febStart, $lte: febEnd }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$amount" }
                    }
                }
            ]).toArray();

            console.log(`Branch: ${col}`);
            console.log(`- Feb Admissions: ${count}`);
            console.log(`- Feb Revenue: ${revenueAgg[0]?.totalRevenue || 0}`);
        }
    } finally {
        await client.close();
    }
}

checkBranchStats();
