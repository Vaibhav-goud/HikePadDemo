const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('HYD-ADM');

        const pipeline = [
            {
                $match: {
                    branch: 'HYD',
                    registrationType: 'Admissions'
                }
            },
            {
                $project: {
                    month: { $month: { date: "$admissionDate", timezone: "Asia/Kolkata" } },
                    year: { $year: { date: "$admissionDate", timezone: "Asia/Kolkata" } },
                    bdeName: 1
                }
            },
            {
                $match: {
                    $or: [
                        { year: 2025, month: 11 },
                        { year: 2025, month: 12 }
                    ]
                }
            },
            {
                $group: {
                    _id: { bde: "$bdeName", year: "$year", month: "$month" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1, "count": -1 }
            }
        ];

        const results = await collection.aggregate(pipeline).toArray();
        console.log('Hyderabad BDE Counts (Nov & Dec 2025):');

        const monthLabels = { 11: 'Nov', 12: 'Dec' };

        const report = {};
        results.forEach(r => {
            const key = `${monthLabels[r._id.month]} ${r._id.year}`;
            if (!report[key]) report[key] = [];
            report[key].push({ BDE: r._id.bde, Count: r.count });
        });

        for (const month in report) {
            console.log(`\n--- ${month} ---`);
            console.table(report[month]);
            const total = report[month].reduce((sum, item) => sum + item.Count, 0);
            console.log(`Total for ${month}: ${total}`);
        }

    } finally {
        await client.close();
    }
}
run();
