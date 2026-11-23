const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugGaganam() {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/hikepad');
    try {
        await client.connect();
        const db = client.db();
        const salesCollection = db.collection('sales_records');
        const usersCollection = db.collection('users');

        const names = ['Gaganam Mohan', 'Monalisa', 'Parth', 'Sonali', 'Ishtiyaque'];

        console.log('--- Sales Records for missing users ---');
        for (const name of names) {
            const records = await salesCollection.find({
                bdeName: { $regex: new RegExp(`^${name}$`, 'i') }
            }).limit(2).toArray();

            console.log(`\nUser: ${name}`);
            if (records.length === 0) {
                console.log('No records found.');
            } else {
                records.forEach(r => {
                    console.log(`Month: ${r.month} | Team: ${r.teamName} | TL: ${r.teamLeader} | ATL: ${r.atl} | Current: ${r.isCurrentTeamMember}`);
                });
            }
        }

        const ishtiyaque = await usersCollection.findOne({ name: 'Ishtiyaque' });
        console.log('\n--- Ishtiyaque Profile ---');
        console.log(JSON.stringify(ishtiyaque, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

debugGaganam();
