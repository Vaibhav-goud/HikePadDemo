const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkMarchTheOne() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const salesCollection = db.collection('sales_records');

        const result = await salesCollection.findOne({ month: 'MARCH', isCurrentTeamMember: true });
        console.log('The ONLY record in March with isCurrentTeamMember=true:');
        console.log(JSON.stringify(result, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkMarchTheOne();
