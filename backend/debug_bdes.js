require('dotenv').config();
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('sales_records');

        const names = ["Gaganam Mohan", "Zohra Baig", "Gulafsha"];

        for (const name of names) {
            console.log(`\nChecking records for ${name}...`);
            const records = await collection.find({
                bdeName: { $regex: new RegExp(`^${name}$`, 'i') }
            }).toArray();

            console.log(`Found ${records.length} records.`);
            records.forEach(r => {
                console.log(`Month: ${r.month.padEnd(10)} | ATL: ${String(r.atl).padEnd(20)} | TL: ${String(r.teamLeader).padEnd(20)} | Current: ${r.isCurrentTeamMember}`);
            });
        }

    } finally {
        await client.close();
    }
}
run().catch(console.dir);
