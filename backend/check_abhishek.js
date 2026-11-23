const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkUserStats() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const salesCollection = db.collection('sales_records');
        const usersCollection = db.collection('users');

        console.log('--- Searching for Abhishek B in Mumbai Branch ---');
        
        const user = await usersCollection.findOne({
            name: { $regex: /Abhishek B/i },
            branch: { $regex: /Mumbai/i }
        });

        if (user) {
            console.log('User found in users collection:');
            console.log(JSON.stringify(user, null, 2));
        }

        const marchRecords = await salesCollection.find({
            bdeName: { $regex: /Abhishek B/i },
            month: 'MARCH',
            branch: { $regex: /Mumbai/i }
        }).toArray();

        if (marchRecords.length > 0) {
            console.log(`Found ${marchRecords.length} records for Abhishek B in March:`);
            marchRecords.forEach(r => {
                console.log(`- Team Leader: ${r.teamLeader}, Target: ${r.target}, Closed Points: ${r.closedPoints}, Achievement: ${r.achievementPct}%`);
                console.log(`- Full Record: ${JSON.stringify(r, null, 2)}`);
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkUserStats();
