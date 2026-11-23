const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('HYD-ADM');

        const records = await collection.find({
            registrationType: { $nin: ['Admissions', 'Registration'] }
        }).toArray();

        console.log('Records with weird RegistrationType:');
        console.log(JSON.stringify(records, null, 2));

    } finally {
        await client.close();
    }
}
run();
