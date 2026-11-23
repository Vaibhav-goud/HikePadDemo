const { MongoClient } = require('mongodb');
require('dotenv').config();

async function inspectDuplicates() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const mumColl = db.collection('MUM-ADM');

        const names = ['siddhi navnath bhosale', 'neha', 'aniket'];

        for (const name of names) {
            console.log(`\n--- Inspecting: ${name} ---`);
            const records = await mumColl.find({ candidateNameNormalized: name }).toArray();
            records.forEach(r => {
                console.log(JSON.stringify({
                    regNo: r.regNo,
                    date: r.admissionDate,
                    status: r.admissionStatus,
                    amount: r.amount,
                    university: r.universityName,
                    program: r.programName,
                    bde: r.bdeName
                }, null, 2));
            });
        }

    } finally {
        await client.close();
    }
}

inspectDuplicates();
