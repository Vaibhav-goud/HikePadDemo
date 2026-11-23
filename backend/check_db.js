const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://vaibhav:Vaibhav123%40@cluster0.2vka7zz.mongodb.net/hike_dashboard_db?retryWrites=true&w=majority';

async function check() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collections = ['HYD-ADM', 'MUM-ADM'];

        for (const col of collections) {
            console.log(`Checking collection: ${col}`);
            const types = await db.collection(col).distinct('registrationType');
            console.log(`Distinct types in ${col}:`, types);

            const countAll = await db.collection(col).countDocuments({});
            console.log(`Total records in ${col}: ${countAll}`);

            if (types.length > 0) {
                const sample = await db.collection(col).findOne({ registrationType: { $exists: true } });
                console.log(`Sample record from ${col}:`, JSON.stringify({
                    type: sample.registrationType,
                    status: sample.admissionStatus,
                    date: sample.admissionDate
                }, null, 2));
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

check();
