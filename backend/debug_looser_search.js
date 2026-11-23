const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugLooser() {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/hikepad');
    try {
        await client.connect();
        const db = client.db();
        const salesCollection = db.collection('sales_records');

        const names = ['Monalisa', 'Parth', 'Sonali'];

        console.log('--- Loose Search for Sales Records ---');
        for (const name of names) {
            const records = await salesCollection.find({
                bdeName: { $regex: new RegExp(name, 'i') }
            }).limit(2).toArray();

            console.log(`\nSearch term: ${name}`);
            if (records.length === 0) {
                console.log('No records found.');
            } else {
                records.forEach(r => {
                    console.log(`Found BDE: ${r.bdeName} | Team: ${r.teamName} | TL: ${r.teamLeader} | ATL: ${r.atl}`);
                });
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

debugLooser();
