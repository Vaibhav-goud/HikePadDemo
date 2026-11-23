require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkMarchData() {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = 'hike_dashboard_db';
    const client = new MongoClient(mongoUri);

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('KRA_Reports_HYD');

        console.log('--- Checking KRA_Reports_HYD for March 2026 ---');
        
        // Count total records
        const total = await collection.countDocuments({});
        console.log(`Total records in KRA_Reports_HYD: ${total}`);

        // Find records with date in March 2026 (assuming YYYY-MM-DD format)
        const marchRecords = await collection.find({
            date: { $regex: /^2026-03/ }
        }).toArray();

        console.log(`Found ${marchRecords.length} records for March 2026.`);

        if (marchRecords.length > 0) {
            console.log('Sample March Records:');
            marchRecords.slice(0, 5).forEach(r => {
                console.log(`- Date: ${r.date}, Name: ${r.name}, Team: ${r.team}, Calls: ${r.calls}`);
            });
        }

        // Also check if there are records for February 2026 to see if data is flowing
        const febRecords = await collection.countDocuments({
            date: { $regex: /^2026-02/ }
        });
        console.log(`Found ${febRecords} records for February 2026.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkMarchData();
