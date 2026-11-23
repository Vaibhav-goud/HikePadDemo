const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function checkBranchValues() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const branches = await db.collection('sales_records').distinct('branch');
        console.log('Branches in sales_records:', branches);
        const admBranchesM = await db.collection('MUM-ADM').distinct('branch');
        console.log('Branches in MUM-ADM:', admBranchesM);
        const admBranchesH = await db.collection('HYD-ADM').distinct('branch');
        console.log('Branches in HYD-ADM:', admBranchesH);
    } finally {
        await client.close();
    }
}

checkBranchValues();
