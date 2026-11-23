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
                    registrationType: { $type: "string", $nin: ["", " "] }
                }
            },
            {
                $project: {
                    month: { $month: { date: "$admissionDate", timezone: "Asia/Kolkata" } },
                    year: { $year: { date: "$admissionDate", timezone: "Asia/Kolkata" } },
                    registrationType: 1
                }
            },
            {
                $group: {
                    _id: { year: "$year", month: "$month" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } }
        ];

        const results = await collection.aggregate(pipeline).toArray();
        console.log('Hyderabad IST Counts:');
        results.forEach(r => {
            console.log(`- ${r._id.year}-${r._id.month}: ${r.count}`);
        });

    } finally {
        await client.close();
    }
}
run();
