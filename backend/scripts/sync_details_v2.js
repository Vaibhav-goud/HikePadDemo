require('dotenv').config();
const admin = require('firebase-admin');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

async function syncDetailedData() {
    console.log('--- Starting Firebase Detailed Data Sync for Cluster0 ---');

    const serviceAccountPath = path.join(__dirname, '../../ServiceAccountMaster.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    const databaseURL = "https://master-836ba-default-rtdb.asia-southeast1.firebasedatabase.app/";

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: databaseURL
    });

    const mongoUri = process.env.MONGODB_URI;
    const dbName = 'hike_dashboard_db';
    const client = new MongoClient(mongoUri);

    try {
        await client.connect();
        const db = client.db(dbName);
        console.log(`✓ Connected to Cluster0 MongoDB: ${dbName}`);

        const configs = [
            { path: 'HYD-DERs', suffix: 'hyd' },
            { path: 'MUM-DERs', suffix: 'mum' }
        ];

        for (const config of configs) {
            console.log(`🚀 Fetching data from: ${config.path}...`);
            const snapshot = await admin.database().ref(config.path).once('value');
            const firebaseData = snapshot.val();

            if (!firebaseData) {
                console.log(`⚠️ No data found in ${config.path}.`);
                continue;
            }

            const records = Object.entries(firebaseData);
            console.log(`📊 Processing ${records.length} records for ${config.path}...`);

            // Sort records into buckets by Month_Year
            const buckets = {};

            for (const [id, data] of records) {
                // Parse date from "Date of Admission" (format: DD/MM/YYYY)
                const dateStr = data["Date of Admission"] || data["Date of Registration"];
                if (!dateStr) continue;

                const parts = dateStr.split('/');
                if (parts.length !== 3) continue;

                const day = parts[0];
                const month = parts[1];
                const year = parts[2];

                const dateObj = new Date(year, month - 1, day);
                const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
                const bucketKey = `${monthName}_${year}_${config.suffix}`;

                if (!buckets[bucketKey]) buckets[bucketKey] = [];

                buckets[bucketKey].push({
                    recordId: id,
                    name: data["BDE Name"] || 'Unknown',
                    candidateName: data["Candidate Name"],
                    date: dateObj,
                    target: Number(data["Amount "]) || 0,
                    points: Number(data["Points"]) || 0,
                    admissions: 1,
                    status: data["Admission Status"],
                    university: data["University Name"],
                    programName: data["Program Name"],
                    feeType: data["Fee Type"],
                    teamLead: data["Team Lead Name"],
                    source: "firebase",
                    updatedAt: new Date()
                });
            }

            // Write each bucket to its collection
            for (const [collectionName, bucketRecords] of Object.entries(buckets)) {
                console.log(`📂 Syncing ${bucketRecords.length} records to collection: ${collectionName}`);
                const collection = db.collection(collectionName);

                // Ensure index
                await collection.createIndex({ recordId: 1 }, { unique: true });

                const operations = bucketRecords.map(data => ({
                    updateOne: {
                        filter: { recordId: data.recordId },
                        update: {
                            $set: data,
                            $setOnInsert: { createdAt: new Date() }
                        },
                        upsert: true
                    }
                }));

                await collection.bulkWrite(operations);
            }
        }

        console.log('\n\x1b[32m✔ Detailed Sync completed successfully for Cluster0.\x1b[0m');

    } catch (error) {
        console.error('❌ Sync failed:', error);
    } finally {
        await client.close();
        admin.app().delete();
        process.exit(0);
    }
}

syncDetailedData();
