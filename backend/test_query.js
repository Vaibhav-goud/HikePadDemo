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
            const query = { registrationType: /Admission/i };
            const count = await db.collection(col).countDocuments(query);
            console.log(`Count for /Admission/i in ${col}: ${count}`);

            const sample = await db.collection(col).find(query).limit(1).toArray();
            if (sample.length > 0) {
                console.log(`Sample match in ${col}:`, JSON.stringify(sample[0], null, 2));
            } else {
                const total = await db.collection(col).countDocuments({});
                console.log(`Total records in ${col}: ${total}`);
                const firstOne = await db.collection(col).findOne({});
                console.log(`First record's registrationType: "${firstOne ? firstOne.registrationType : 'N/A'}"`);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

check();
