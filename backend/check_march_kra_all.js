require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkMarchData() {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = 'hike_dashboard_db';
    const client = new MongoClient(mongoUri);

    try {
        await client.connect();
        const db = client.db(dbName);
        const colHYD = db.collection('KRA_Reports_HYD');
        const colMUM = db.collection('KRA_Reports_MUM');

        console.log('--- Checking KRA_Reports for March 2026 ---');
        
        const countHYD = await colHYD.countDocuments({ date: { $regex: /^2026-03/ } });
        console.log(`Hyderabad March: ${countHYD}`);

        const countMUM = await colMUM.countDocuments({ date: { $regex: /^2026-03/ } });
        console.log(`Mumbai March: ${countMUM}`);

        if (countMUM === 0) {
            console.log('Mumbai March data is 0. Checking why...');
            const lastMUM = await colMUM.find({}).sort({ date: -1 }).limit(1).toArray();
            if (lastMUM.length > 0) {
                console.log(`Last Mumbai record: ${lastMUM[0].date}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkMarchData();
