const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config();

async function checkFebData() {
    const mongoUri = process.env.MONGO_URI;
    const client = new MongoClient(mongoUri);
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

        console.log(`Total Admissions for Mumbai in Feb 2026: ${count}`);
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

        // Check if there are "Admission" records that didn't get mapped to "Admissions"
        const specificTypes = await collection.distinct('registrationType');
        console.log('All Registration Types in collection:', specificTypes);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

checkFebData();
