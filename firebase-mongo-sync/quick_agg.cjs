const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function runTest() {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db('hike_dashboard_db');

    console.log("Connected to Mongo.");

    const matchStage = {
        registrationType: 'Admissions',
        admissionDate: {
            $gte: new Date('2026-02-01T00:00:00Z'),
            $lte: new Date('2026-02-28T23:59:59Z')
        }
    };

    // Check total and sum amount for all Feb admissions globally
    const agg = await db.collection('MUM-ADM').aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalAdmissions: { $sum: 1 },
                totalRevenue: { $sum: "$amount" }
            }
        }
    ]).toArray();
    console.log('MUMBAI Feb Data in MongoDB:', agg);

    // Test what HYD has
    const hydAgg = await db.collection('HYD-ADM').aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalAdmissions: { $sum: 1 },
                totalRevenue: { $sum: "$amount" }
            }
        }
    ]).toArray();
    console.log('HYDERABAD Feb Data in MongoDB:', hydAgg);

    await client.close();
}

runTest();
