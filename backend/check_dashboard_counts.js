const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkDashboardCounts() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const salesColl = db.collection('sales_records');

        const query = {
            month: 'FEBRUARY',
            branch: 'Mumbai Branch'
        };

        const records = await salesColl.find(query).toArray();
        const totalAdmissions = records.reduce((sum, r) => sum + (Number(r.closedAdm) || 0), 0);

        console.log(`Total Sales Records found for Feb Mumbai: ${records.length}`);
        console.log(`Sum of closedAdm in Sales Records: ${totalAdmissions}`);

        // Also check if some records use 'MUM' instead of 'Mumbai'
        const alternateQuery = {
            month: 'FEBRUARY',
            branch: 'MUM'
        };
        const altRecords = await salesColl.find(alternateQuery).toArray();
        const altTotal = altRecords.reduce((sum, r) => sum + (Number(r.closedAdm) || 0), 0);
        console.log(`Sum of closedAdm in Sales Records (branch='MUM'): ${altTotal}`);

    } finally {
        await client.close();
    }
}

checkDashboardCounts();
