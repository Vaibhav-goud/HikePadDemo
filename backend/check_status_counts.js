const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkStatusCounts() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const mumColl = db.collection('MUM-ADM');

        // Revenue page date range (India time 2026-02-01 to 2026-02-28)
        // Adjusting for UTC: 2026-01-31T18:30:00Z to 2026-02-28T18:29:59.999Z
        const startDate = new Date('2026-01-31T18:30:00.000Z');
        const endDate = new Date('2026-02-28T18:29:59.999Z');

        const query = {
            registrationType: 'Admissions',
            admissionDate: {
                $gte: startDate,
                $lte: endDate
            },
            branch: 'MUM'
        };

        const total = await mumColl.countDocuments(query);
        console.log(`Total records in Revenue Range: ${total}`);

        const statusCounts = await mumColl.aggregate([
            { $match: query },
            { $group: { _id: "$admissionStatus", count: { $sum: 1 } } }
        ]).toArray();

        console.log('Status Counts:');
        statusCounts.forEach(s => console.log(`${s._id}: ${s.count}`));

        // Find the record on Jan 31st
        const janRecord = await mumColl.findOne({
            admissionDate: new Date('2026-01-31T18:30:00.000Z')
        });
        if (janRecord) {
            console.log('\nRecord on Jan 31st 18:30 (Feb 1st IST):');
            console.log(JSON.stringify(janRecord, null, 2));
        }

        // Check for records that might be from previous months but late entry?
        // No, we filter by admissionDate.

    } finally {
        await client.close();
    }
}

checkStatusCounts();
