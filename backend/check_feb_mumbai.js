const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkFebData() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('MUM-ADM');

        const startDate = new Date('2026-02-01T00:00:00.000Z');
        const endDate = new Date('2026-02-28T23:59:59.999Z');

        const query = {
            registrationType: 'Admissions',
            admissionDate: {
                $gte: startDate,
                $lte: endDate
            }
        };

        const count = await collection.countDocuments(query);
        const sample = await collection.find(query).limit(5).toArray();

        console.log(`Total Missions for Mumbai in Feb 2026: ${count}`);
        console.log('Sample records:');
        sample.forEach(r => {
            console.log(`- RegNo: ${r.regNo}, Date: ${r.admissionDate}, Type: ${r.registrationType}, Status: ${r.admissionStatus}`);
        });

        // Check for records with different registrationType if count is low
        const allFeb = await collection.countDocuments({
            admissionDate: {
                $gte: startDate,
                $lte: endDate
            }
        });
        console.log(`Total records for Mumbai in Feb (any registrationType): ${allFeb}`);

        const types = await collection.distinct('registrationType', {
            admissionDate: {
                $gte: startDate,
                $lte: endDate
            }
        });
        console.log('Registration Types found in Feb:', types);

    } finally {
        await client.close();
    }
}

checkFebData();
