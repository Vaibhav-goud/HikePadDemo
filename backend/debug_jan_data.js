require('dotenv').config();
const { connectToDB, getDB } = require('./mongo');

async function debugData() {
    try {
        await connectToDB();
        const db = getDB();
        const collection = db.collection('sales_records');

        // Filter for January (Month) and Hyderabad Branch
        // Note: Check how 'January' is stored. Usually 'JANUARY' (uppercase) based on previous code.
        const query = {
            branch: 'Hyderabad Branch',
            month: 'JANUARY'
        };

        const records = await collection.find(query).toArray();
        console.log(`\nFound ${records.length} records for Hyderabad Branch in JANUARY\n`);

        let totalTarget = 0;
        let totalAdmissions = 0;
        let totalClosedPoints = 0;

        const teamStats = {};
        const bdeMap = {};

        records.forEach(r => {
            const target = Number(r.target) || 0;
            const admissions = Number(r.admissions) || 0; // Using corrected field
            const points = Number(r.closedPoints) || 0;

            totalTarget += target;
            totalAdmissions += admissions;
            totalClosedPoints += points;

            // Stats by Team Leader
            const tl = r.teamLeader || 'Unknown';
            if (!teamStats[tl]) {
                teamStats[tl] = { count: 0, target: 0, admissions: 0, points: 0, bdes: new Set() };
            }
            teamStats[tl].count++;
            teamStats[tl].target += target;
            teamStats[tl].admissions += admissions;
            teamStats[tl].points += points;
            teamStats[tl].bdes.add(r.bdeName);

            // Access check for BDE Duplicates
            if (!bdeMap[r.bdeName]) {
                bdeMap[r.bdeName] = [];
            }
            bdeMap[r.bdeName].push({
                tl: tl,
                target: target,
                id: r._id
            });
        });

        console.log('--- Overall Totals ---');
        console.log(`Total Target: ${totalTarget} (Dashboard shows 211?)`);
        console.log(`Total Admissions: ${totalAdmissions}`);
        console.log(`Total Closed Points: ${totalClosedPoints}`);

        console.log('\n--- Totals by Team Leader ---');
        Object.entries(teamStats).forEach(([tl, stats]) => {
            console.log(`\nTeam Leader: ${tl}`);
            console.log(`  Records: ${stats.count}`);
            console.log(`  BDE Count: ${stats.bdes.size}`);
            console.log(`  Target: ${stats.target}`);
            console.log(`  Admissions: ${stats.admissions}`);
            console.log(`  BDEs: ${Array.from(stats.bdes).join(', ')}`);
        });

        console.log('\n--- Duplicate BDE Check ---');
        let duplicateFound = false;
        Object.entries(bdeMap).forEach(([bde, entries]) => {
            if (entries.length > 1) {
                // Check if they are under different Team Leaders
                const tls = new Set(entries.map(e => e.tl));
                if (tls.size > 1) {
                    console.log(`\n!! BDE ${bde} found under multiple teams: ${Array.from(tls).join(', ')}`);
                    duplicateFound = true;
                    entries.forEach(e => {
                        console.log(`   - TL: ${e.tl}, Target: ${e.target}`);
                    });
                }
            }
        });

        if (!duplicateFound) {
            console.log('No BDEs found under multiple team leaders.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

debugData();
