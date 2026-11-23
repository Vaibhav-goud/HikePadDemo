const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('HYD-ADM');

        const records = await collection.find({ admissionDate: null, registrationType: { $exists: true, $ne: "" } }).toArray();
        console.log('Records with null admissionDate:');
        records.forEach(r => {
            // Log raw fields from Firebase if they were preserved or just the ones we have
            console.log(`${r.regNo} - ${r.candidateName} - Type: ${r.registrationType} - RegDate: ${r.registrationDate}`);
        });

    } finally {
        await client.close();
    }
}
run();
