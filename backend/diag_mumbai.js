require('dotenv').config();
const { MongoClient } = require('mongodb');

const normalizeName = (name) => {
    if (!name || typeof name !== 'string') return '';
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^a-z0-9\s]/g, '');
};

async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');

        console.log('--- USERS ---');
        const users = await db.collection('users').find({ branch: 'Mumbai Branch', inactive: { $ne: true } }).toArray();
        console.log(users.map(u => ({ name: u.name, role: u.role, norm: normalizeName(u.name) })));

        console.log('\n--- BDE MEMBERSHIPS (Mumbai) ---');
        const memberships = await db.collection('sales_records').find({ branch: 'Mumbai Branch', isCurrentTeamMember: true }).toArray();
        const mappedBdes = memberships.map(m => ({
            bde: m.bdeName,
            leader: m.teamLeader,
            team: m.teamName,
            leaderNorm: normalizeName(m.teamLeader)
        }));
        console.log(mappedBdes);

        console.log('\n--- BDEs in Mumbai Admissions with no membership ---');
        const mumAdmissions = await db.collection('MUM-ADM').find({}).toArray();
        const adBdes = [...new Set(mumAdmissions.map(a => a.bdeName))];
        const unmapped = [];
        const membershipBdeNorms = new Set(memberships.map(m => normalizeName(m.bdeName)));

        for (const bdeName of adBdes) {
            if (!membershipBdeNorms.has(normalizeName(bdeName))) {
                const sample = mumAdmissions.find(a => a.bdeName === bdeName);
                unmapped.push({ bde: bdeName, recLeader: sample.teamLeadName, recLeaderNorm: normalizeName(sample.teamLeadName) });
            }
        }
        console.log(unmapped);

    } finally {
        await client.close();
    }
}
run();
