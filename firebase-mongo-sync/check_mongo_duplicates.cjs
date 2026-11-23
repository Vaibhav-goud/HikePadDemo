const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('HYD-ADM');

        const stats = await collection.aggregate([
            {
                $group: {
                    _id: "$candidateNameNormalized",
                    count: { $sum: 1 },
                    records: { $push: { regNo: "$regNo", date: "$admissionDate", type: "$registrationType" } }
                }
            },
            {
                $match: {
                    count: { $gt: 1 },
                    _id: { $ne: null }
                }
            }
        ]).toArray();

        console.log('Duplicate Names in Mongo:');
        stats.forEach(s => {
            console.log(`\nName: ${s._id}`);
            s.records.forEach(r => {
                console.log(`  - RegNo: ${r.regNo} | Date: ${r.date} | Type: ${r.type}`);
            });
        });

    } finally {
        await client.close();
    }
}
run();
