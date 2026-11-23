const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function countByMonth() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('MUM-ADM');

        const pipeline = [
            {
                $match: {
                    registrationType: 'Admissions'
                }
            },
            {
                $project: {
                    month: { $month: "$admissionDate" },
                    year: { $year: "$admissionDate" }
                }
            },
            {
                $group: {
                    _id: { year: "$year", month: "$month" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.year": -1, "_id.month": -1 }
            }
        ];

        const results = await collection.aggregate(pipeline).toArray();
        console.log('Mumbai Admissions Count by Month:');
        results.forEach(r => {
            console.log(`- ${r._id.year}-${r._id.month}: ${r.count}`);
        });

        // Also check "Registration" records just in case
        const pipelineReg = [
            {
                $match: {
                    registrationType: 'Registration'
                }
            },
            {
                $project: {
                    month: { $month: "$admissionDate" },
                    year: { $year: "$admissionDate" }
                }
            },
            {
                $group: {
                    _id: { year: "$year", month: "$month" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.year": -1, "_id.month": -1 }
            }
        ];
        const resultsReg = await collection.aggregate(pipelineReg).toArray();
        console.log('Mumbai Registration Count by Month:');
        resultsReg.forEach(r => {
            console.log(`- ${r._id.year}-${r._id.month}: ${r.count}`);
        });

    } finally {
        await client.close();
    }
}

countByMonth();
