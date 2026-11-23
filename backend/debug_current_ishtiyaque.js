require('dotenv').config();
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('sales_records');

        const name = "Ishtiyaque";
        const nameLower = name.toLowerCase();

        console.log(`Checking current team members for ${name}...`);

        const currentMembers = await collection.find({
            isCurrentTeamMember: true,
            $or: [
                { atl: { $regex: new RegExp(`^${name}$`, 'i') } },
                { teamLeader: { $regex: new RegExp(`^${name}$`, 'i') } }
            ]
        }).toArray();

        console.log(`Found ${currentMembers.length} records where ${name} is ATL/TL and isCurrentTeamMember is true:`);

        const memberNames = new Set();
        currentMembers.forEach(r => {
            console.log(`BDE: ${r.bdeName.padEnd(20)} | ATL: ${String(r.atl).padEnd(20)} | TL: ${String(r.teamLeader).padEnd(20)} | Branch: ${r.branch} | Month: ${r.month} | FY: ${r.fy}`);
            memberNames.add(r.bdeName);
        });

        console.log('\nUnique current member names:', Array.from(memberNames));

    } finally {
        await client.close();
    }
}
run().catch(console.dir);
