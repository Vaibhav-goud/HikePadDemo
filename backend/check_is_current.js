const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkIsCurrent() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const salesCollection = db.collection('sales_records');

        const marchCount = await salesCollection.countDocuments({ month: 'MARCH' });
        const marchCurrentCount = await salesCollection.countDocuments({ month: 'MARCH', isCurrentTeamMember: true });
        
        console.log(`March Total: ${marchCount}`);
        console.log(`March isCurrentTeamMember=true: ${marchCurrentCount}`);

        const abhishekMarch = await salesCollection.findOne({ bdeName: 'Abhishek B', month: 'MARCH' });
        console.log('Abhishek B March record:');
        console.log(JSON.stringify(abhishekMarch, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkIsCurrent();
