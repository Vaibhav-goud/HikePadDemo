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
            candidateName: { $in: [/NAVNEET SHUKLA/i, /anubhav kumar/i] }
        }).toArray();

        console.log(JSON.stringify(records.map(r => ({ name: r.candidateName, type: r.registrationType, date: r.admissionDate || r.registrationDate, status: r.admissionStatus })), null, 2));

    } finally {
        await client.close();
    }
}
run();
