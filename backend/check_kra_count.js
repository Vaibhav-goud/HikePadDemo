const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkAnyKRA() {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/hikepad');
    try {
        await client.connect();
        const db = client.db();
        const kraCollection = db.collection('KRA_Reports_HYD');

        console.log('--- Total records in kra_reports ---');
        const count = await kraCollection.countDocuments();
        console.log(`Count: ${count}`);

        console.log('\n--- Sample records ---');
        const samples = await kraCollection.find({}).limit(5).toArray();
        console.log(JSON.stringify(samples, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkAnyKRA();
