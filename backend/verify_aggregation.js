require('dotenv').config();
const { connectToDB, getDB } = require('./mongo');

async function verifyAggregation() {
    try {
        await connectToDB();
        const db = getDB();
        const salesCollection = db.collection('sales_records');

        // This matches the NEW logic in server.js
        const aggregation = [
            {
                $match: { month: 'JANUARY', branch: 'Hyderabad Branch' }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'bdeName',
                    foreignField: 'name',
                    as: 'userDetails'
                }
            },
            {
                $addFields: {
                    userDetails: { $arrayElemAt: ['$userDetails', 0] }
                }
            },
            {
                $addFields: {
                    id: '$_id',
                    inactive: { $ifNull: ['$userDetails.inactive', false] },
                    isCurrentTeamMember: { $ifNull: ['$isCurrentTeamMember', true] },
                    role: '$userDetails.role'
                }
            }
        ];

        const results = await salesCollection.aggregate(aggregation).toArray();
        console.log(`\nAggregated Rows Count: ${results.length}`);

        const totalTarget = results.reduce((sum, r) => sum + (Number(r.target) || 0), 0);
        console.log(`Aggregated Total Target: ${totalTarget}`);

        // Check for Ishtiyaque specifically
        const ishtiyaqueRecords = results.filter(r => r.bdeName && r.bdeName.match(/ishtiyaque/i));
        console.log(`Ishtiyaque Aggregated Records: ${ishtiyaqueRecords.length}`);
        ishtiyaqueRecords.forEach(r => console.log(` - Target: ${r.target}, ID: ${r._id}`));

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

verifyAggregation();
