const { MongoClient } = require('mongodb');
require('dotenv').config();

const normalizeName = (name) => {
    if (!name) return '';
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
};

const buildAdmissionsQuery = (params) => {
    const { admissionStatus, startDate, endDate, universityName } = params;
    const query = { registrationType: 'Admissions' };

    if (startDate || endDate) {
        query.admissionDate = {};
        if (startDate) query.admissionDate.$gte = new Date(startDate);
        if (endDate) query.admissionDate.$lte = new Date(endDate);
    }

    if (admissionStatus) query.admissionStatus = admissionStatus;
    if (universityName) query.universityName = universityName;

    return query;
};

async function testStatsApi() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');

        const params = {
            branch: 'MUM',
            startDate: '2026-02-01T00:00:00.000Z',
            endDate: '2026-02-28T23:59:59.999Z'
        };

        const query = buildAdmissionsQuery(params);
        console.log('Query:', JSON.stringify(query));

        const collectionsToQuery = ['MUM-ADM']; // Simplified for MUM
        let allStats = [];

        for (const colName of collectionsToQuery) {
            const collection = db.collection(colName);
            const stats = await collection.aggregate([
                { $match: { ...query, branch: params.branch } },
                {
                    $group: {
                        _id: "$bdeNameNormalized",
                        totalAdmissions: { $sum: 1 },
                    }
                }
            ]).toArray();
            allStats = allStats.concat(stats);
        }

        console.log('Resulting Stats:', allStats);
        const total = allStats.reduce((sum, s) => sum + s.totalAdmissions, 0);
        console.log('Total Admissions:', total);

        // Check if there are any records missing bdeNameNormalized but having bdeName
        const missingNormalized = await db.collection('MUM-ADM').countDocuments({
            ...query,
            branch: 'MUM',
            bdeNameNormalized: { $exists: false }
        });
        console.log('Records missing bdeNameNormalized:', missingNormalized);

    } finally {
        await client.close();
    }
}

testStatsApi();
