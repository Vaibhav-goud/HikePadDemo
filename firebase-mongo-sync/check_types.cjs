const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb+srv://vaibhav:HikePad123@hikepad.pxz6r.mongodb.net/?retryWrites=true&w=majority&appName=HikePad');
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const collection = db.collection('HYD-ADM');

        const sample = await collection.findOne({ admissionDate: { $exists: true } });
        if (sample) {
            console.log('Sample admissionDate field type:', typeof sample.admissionDate);
            console.log('Sample admissionDate value:', sample.admissionDate);
            console.log('Is Date object?', sample.admissionDate instanceof Date);
        } else {
            console.log('No records found with admissionDate field.');
        }

        const countAll = await collection.countDocuments({});
        console.log('Total documents in HYD-ADM:', countAll);

        const countWithDate = await collection.countDocuments({ admissionDate: { $type: 'date' } });
        console.log('Documents with admissionDate as Date:', countWithDate);

        const countWithStringDate = await collection.countDocuments({ admissionDate: { $type: 'string' } });
        console.log('Documents with admissionDate as String:', countWithStringDate);

        const countWithNoDate = await collection.countDocuments({ admissionDate: null });
        console.log('Documents with admissionDate as null:', countWithNoDate);

    } finally {
        await client.close();
    }
}
run();
