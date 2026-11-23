const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('HYD-ADM');

        const decRecords = await collection.find({
            $expr: {
                $and: [
                    { $eq: [{ $year: "$admissionDate" }, 2025] },
                    { $eq: [{ $month: "$admissionDate" }, 12] }
                ]
            }
        }).toArray();

        console.log(`Found ${decRecords.length} records in Dec 2025`);
        const typeCounts = {};
        decRecords.forEach(r => {
            const type = r.registrationType || 'BLANK';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
            if (type !== 'Admissions') {
                console.log(`Non-Admission Record: ${r.regNo} - ${r.candidateName} - Type: [${type}]`);
            }
        });
        console.log('Type breakdown for Dec 2025:', typeCounts);

    } finally {
        await client.close();
    }
}
run();
