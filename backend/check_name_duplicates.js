const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkDuplicates() {
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
        const nameMap = new Map();
        const duplicates = [];

        records.forEach(r => {
            const name = r.candidateNameNormalized;
            if (nameMap.has(name)) {
                duplicates.push({ name, first: nameMap.get(name), second: r });
            } else {
                nameMap.set(name, r);
            }
        });

        console.log(`Duplicate Candidate Names found: ${duplicates.length}`);
        duplicates.forEach(d => {
            console.log(`\nName: ${d.name}`);
            console.log(`1: RegNo: ${d.first.regNo}, Date: ${d.first.admissionDate.toISOString()}, Status: ${d.first.admissionStatus}`);
            console.log(`2: RegNo: ${d.second.regNo}, Date: ${d.second.admissionDate.toISOString()}, Status: ${d.second.admissionStatus}`);
        });

    } finally {
        await client.close();
    }
}

checkDuplicates();
