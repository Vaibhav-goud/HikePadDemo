const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkFebData() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');

        const startDate = new Date('2026-02-01T00:00:00.000Z');
        const endDate = new Date('2026-02-28T23:59:59.999Z');

        console.log(`Checking Mumbai (MUM-ADM) collection...`);
        const mumColl = db.collection('MUM-ADM');

        const mumQuery = {
            registrationType: 'Admissions',
            admissionDate: {
                $gte: startDate,
                $lte: endDate
            }
        };

        const mumCount = await mumColl.countDocuments(mumQuery);
        console.log(`Total Missions for Mumbai collection (Type: Admissions): ${mumCount}`);

        const branches = await mumColl.distinct('branch', mumQuery);
        console.log(`Branches found in MUM-ADM for Feb: ${JSON.stringify(branches)}`);

        // Check if any Mumbai records are in HYD-ADM
        console.log(`\nChecking Hyderabad (HYD-ADM) collection...`);
        const hydColl = db.collection('HYD-ADM');
        const hydCount = await hydColl.countDocuments({
            ...mumQuery,
            branch: 'Mumbai' // Assuming 'Mumbai' is the branch name
        });
        console.log(`Total Mumbai Missions found in HYD-ADM collection: ${hydCount}`);

        const allHydMumbai = await hydColl.distinct('branch', {
            admissionDate: {
                $gte: startDate,
                $lte: endDate
            }
        });
        console.log(`Branches found in HYD-ADM for Feb: ${JSON.stringify(allHydMumbai)}`);

        // Check for duplicate regNo across both
        const allMUMRecords = await mumColl.find(mumQuery).toArray();
        const allHYDRecords = await hydColl.find({
            registrationType: 'Admissions',
            admissionDate: {
                $gte: startDate,
                $lte: endDate
            }
        }).toArray();

        const regNos = new Set();
        const duplicates = [];
        allMUMRecords.forEach(r => {
            if (regNos.has(r.regNo)) duplicates.push(r.regNo);
            regNos.add(r.regNo);
        });

        console.log(`\nDuplicates in MUM-ADM: ${duplicates.length}`);
        if (duplicates.length > 0) console.log('Duplicate RegNos:', duplicates);

        // Check for records where branch filter might exclude some
        const mumNoBranchFilter = await mumColl.countDocuments({
            registrationType: 'Admissions',
            admissionDate: {
                $gte: startDate,
                $lte: endDate
            }
        });
        console.log(`\nMUM-ADM count without branch='Mumbai' filter: ${mumNoBranchFilter}`);

        // Get count of records where branch is Mumbai or MUM
        const mumBranchMUM = await mumColl.countDocuments({
            registrationType: 'Admissions',
            admissionDate: {
                $gte: startDate,
                $lte: endDate
            },
            branch: 'Mumbai'
        });
        console.log(`MUM-ADM count with branch='Mumbai': ${mumBranchMUM}`);

        const mumBranchM = await mumColl.countDocuments({
            registrationType: 'Admissions',
            admissionDate: {
                $gte: startDate,
                $lte: endDate
            },
            branch: 'MUM'
        });
        console.log(`MUM-ADM count with branch='MUM': ${mumBranchM}`);

    } finally {
        await client.close();
    }
}

checkFebData();
