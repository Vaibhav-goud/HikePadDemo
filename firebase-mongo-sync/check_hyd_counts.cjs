const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function countByMonth() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('HYD-ADM');

        const pipeline = [
            {
                $match: {
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
                    _id: { year: "$year", month: "$month", type: "$registrationType" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.year": -1, "_id.month": -1, "_id.type": 1 }
            }
        ];

        const results = await collection.aggregate(pipeline).toArray();
        console.log('Hyderabad Counts by Month and Type:');
        const unknownAdmissions = [];
        results.forEach(r => {
            const dateStr = (r._id.year && r._id.month) ? `${r._id.year}-${r._id.month}` : 'Unknown Date';
            console.log(`- ${dateStr} [${r._id.type || 'No Type'}]: ${r.count}`);
            if (dateStr === 'Unknown Date' && r._id.type === 'Admissions') {
                // We'll need another query to get these
            }
        });

        const unknowns = await collection.find({ admissionDate: null, registrationType: 'Admissions' }).toArray();
        if (unknowns.length > 0) {
            console.log('\nWarning: The following Admissions have NO admissionDate:');
            unknowns.forEach(u => console.log(`  - ${u.regNo} (${u.candidateName})`));
        }

    } finally {
        await client.close();
    }
}

countByMonth();
