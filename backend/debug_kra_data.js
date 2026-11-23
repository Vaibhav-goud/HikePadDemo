const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugKRA() {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/hikepad');
    try {
        await client.connect();
        const db = client.db();
        const kraCollection = db.collection('kra_reports');

        const names = ['Gaganam Mohan', 'Monalisa', 'Parth', 'Sonali'];

        console.log('--- KRA Reports for specific users ---');
        for (const name of names) {
            const reports = await kraCollection.find({
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            }).limit(2).toArray();

            console.log(`\nUser: ${name}`);
            if (reports.length === 0) {
                console.log('No reports found in kra_reports.');
            } else {
                reports.forEach(r => {
                    console.log(`Date: ${r.date} | Team: ${r.team} | Calls: ${r.calls}`);
                });
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

debugKRA();
