const { MongoClient } = require('mongodb');
require('dotenv').config();

async function findDiscrepancies() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const mumColl = db.collection('MUM-ADM');

        const startDate = new Date('2026-01-31T18:30:00.000Z');
        const endDate = new Date('2026-02-28T18:29:59.999Z');

        const query = {
            registrationType: 'Admissions',
            admissionDate: {
                $gte: startDate,
                $lte: endDate
            },
            branch: 'MUM'
        };

        const records = await mumColl.find(query).toArray();
        console.log(`Total MUM-ADM records: ${records.length}`);

        console.log('\n--- Status: BACKOUT ---');
        const backouts = records.filter(r => r.admissionStatus === 'BACKOUT');
        backouts.forEach(r => console.log(`${r.regNo} - ${r.candidateName} - ${r.bdeName}`));

        // Find duplicates by Candidate Name (normalized)
        const nameGroups = {};
        records.forEach(r => {
            const name = r.candidateNameNormalized;
            if (!nameGroups[name]) nameGroups[name] = [];
            nameGroups[name].push(r);
        });

        console.log('\n--- Potential Duplicates (Same Candidate Name) ---');
        Object.entries(nameGroups).forEach(([name, group]) => {
            if (group.length > 1) {
                console.log(`\nName: ${name} (${group.length} records)`);
                group.forEach(r => {
                    console.log(`  RegNo: ${r.regNo}, Status: ${r.admissionStatus}, BDE: ${r.bdeName}, Amount: ${r.amount}, Univ: ${r.universityName}`);
                });
            }
        });

    } finally {
        await client.close();
    }
}

findDiscrepancies();
