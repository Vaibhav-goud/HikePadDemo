const { MongoClient } = require('mongodb');
require('dotenv').config();

async function inspectSalesRecords() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const salesColl = db.collection('sales_records');

        const sample = await salesColl.find().sort({ _id: -1 }).limit(5).toArray();
        console.log('Sample Sales Records:');
        sample.forEach(r => {
            console.log(`Month: ${r.month}, Branch: ${r.branch}, BDE: ${r.bdeName}, closedAdm: ${r.closedAdm}`);
        });

        // Let's get distinct months and branches
        const months = await salesColl.distinct('month');
        const branches = await salesColl.distinct('branch');
        console.log('\nDistinct Months:', months);
        console.log('Distinct Branches:', branches);

    } finally {
        await client.close();
    }
}

inspectSalesRecords();
