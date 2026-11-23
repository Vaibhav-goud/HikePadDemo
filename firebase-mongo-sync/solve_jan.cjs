const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function solveJanDiscrepancy() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('MUM-ADM');

        const janStart = new Date('2026-01-01T00:00:00Z');
        const janEnd = new Date('2026-01-31T23:59:59Z');

        // 1. Total Admissions in Jan via simple count
        const totalAdmissions = await collection.countDocuments({
            registrationType: 'Admissions',
            admissionDate: { $gte: janStart, $lte: janEnd }
        });
        console.log(`Total Admissions (Jan): ${totalAdmissions}`);

        // 2. Breakdown per registrationType to be sure
        const types = await collection.aggregate([
            { $match: { admissionDate: { $gte: janStart, $lte: janEnd } } },
            { $group: { _id: "$registrationType", count: { $sum: 1 } } }
        ]).toArray();
        console.log('Types in Jan:', types);

        // 3. Search for the 190th record. Maybe it's in registrationType: "Registration"?
        const registrations = await collection.find({
            registrationType: 'Registration',
            admissionDate: { $gte: janStart, $lte: janEnd }
        }).toArray();
        console.log(`Registrations in Jan: ${registrations.length}`);

        // 4. Check for records with "Admission" (singular)
        const singular = await collection.countDocuments({
            registrationType: 'Admission',
            admissionDate: { $gte: janStart, $lte: janEnd }
        });
        console.log(`Singular "Admission" records: ${singular}`);

        // 5. Why the page shows 188? 
        // Let's check for BDE names that are empty or might be problematic
        const problematicBde = await collection.countDocuments({
            registrationType: 'Admissions',
            admissionDate: { $gte: janStart, $lte: janEnd },
            $or: [
                { bdeName: { $in: [null, "", "Unknown", "unknown"] } },
                { bdeName: /^\s*$/ }
            ]
        });
        console.log(`Problematic BDE records: ${problematicBde}`);

        // 6. Check for duplicate registration numbers (maybe the user counts them twice?)
        const duplicates = await collection.aggregate([
            { $match: { registrationType: 'Admissions', admissionDate: { $gte: janStart, $lte: janEnd } } },
            { $group: { _id: "$regNo", count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();
        console.log(`Duplicate RegNos in Jan Admissions: ${duplicates.length}`);

    } finally {
        await client.close();
    }
}

solveJanDiscrepancy();
