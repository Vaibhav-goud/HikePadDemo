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

        // 1. Get Active Users
        const activeUsers = await db.collection('users').find({ inactive: { $ne: true } }).toArray();
        const activeUsersMap = new Map();
        activeUsers.forEach(u => activeUsersMap.set(normalizeName(u.name), u));

        // Aliases from server.js
        const leaderAliases = {
            'prati t': 'pratik t',
            'soumya shukla': 'soumya s',
            'ishtiyaque': 'ishtiyaque'
        };

        // 2. Get Memberships
        const memberships = await db.collection('sales_records').find({ isCurrentTeamMember: true }).toArray();
        const bdeToTeamMap = new Map();
        memberships.forEach(m => {
            bdeToTeamMap.set(normalizeName(m.bdeName), true);
        });

        // 3. Analyze HYD Admissions
        const hydAdmissions = await db.collection('HYD-ADM').find({}).toArray();
        const othersData = [];

        hydAdmissions.forEach(adm => {
            const bdeNameNorm = normalizeName(adm.bdeName);
            const leaderNorm = normalizeName(adm.teamLeadName);
            const resolvedLeaderNorm = leaderAliases[leaderNorm] || leaderNorm;

            const mapping = bdeToTeamMap.get(bdeNameNorm);
            const activeUser = activeUsersMap.get(resolvedLeaderNorm);
            const isActiveLeader = !!activeUser;

            let finalMapKey;
            if (isActiveLeader) {
                if (mapping) {
                    finalMapKey = 'Assigned Team';
                } else if (bdeNameNorm === resolvedLeaderNorm) {
                    finalMapKey = 'Personal Performance';
                } else {
                    finalMapKey = 'Former Teams & Unassigned';
                }
            } else {
                finalMapKey = 'Former Teams & Unassigned';
            }

            if (finalMapKey === 'Former Teams & Unassigned') {
                othersData.push({
                    bde: adm.bdeName,
                    recordedLeader: adm.teamLeadName,
                    amount: adm.amount,
                    reason: !isActiveLeader ? 'Leader Inactive/Missing' : 'Unmapped BDE'
                });
            }
        });

        // Summarize by BDE
        const bdeSummary = othersData.reduce((acc, curr) => {
            if (!acc[curr.bde]) {
                acc[curr.bde] = { count: 0, revenue: 0, leader: curr.recordedLeader, reason: curr.reason };
            }
            acc[curr.bde].count += 1;
            acc[curr.bde].revenue += curr.amount;
            return acc;
        }, {});

        console.log('--- Breakdown of "Former Teams & Unassigned" (HYD) ---');
        console.table(Object.entries(bdeSummary).map(([name, stats]) => ({
            "BDE Name": name,
            "Recorded Leader": stats.leader,
            "Enrollments": stats.count,
            "Revenue": stats.revenue,
            "Status": stats.reason
        })).sort((a, b) => b.Revenue - a.Revenue).slice(0, 20));

    } finally {
        await client.close();
    }
}
run();
