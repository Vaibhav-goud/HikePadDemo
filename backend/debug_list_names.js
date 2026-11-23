const { MongoClient } = require('mongodb');
require('dotenv').config();

async function listAll() {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/hikepad');
    try {
        await client.connect();
        const db = client.db();
        const salesCollection = db.collection('sales_records');

        console.log('--- Sample BDE names from sales_records ---');
        const samples = await salesCollection.find({}).limit(50).toArray();
        const names = [...new Set(samples.map(s => s.bdeName))];
        console.log(names);

        console.log('\n--- Searching for Monalisa with ANY regex ---');
        const findMona = await salesCollection.find({ bdeName: /Mona/i }).toArray();
        console.log(`Found ${findMona.length} records for Mona`);
        if (findMona.length > 0) {
            console.log(`BDE Name: ${findMona[0].bdeName}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

listAll();
