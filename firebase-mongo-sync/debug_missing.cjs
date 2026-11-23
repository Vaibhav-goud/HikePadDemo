const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('HYD-ADM');

        const regNos = ['248382', '248565'];
        const records = await collection.find({ regNo: { $in: regNos } }).toArray();

        console.log('Specific records in Mongo:');
        records.forEach(r => {
            console.log(JSON.stringify(r, null, 2));
        });

    } finally {
        await client.close();
    }
}
run();
