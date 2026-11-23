const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const admin = require('firebase-admin');
const { connectToDB, getDB } = require('../mongo');
const { COLLECTION_NAME, formatCollectionName, ensureIndexes } = require('../models/Detail');

async function firebaseSync() {
    console.log('--- Starting Firebase Detailed Data Sync (Separated by Month) ---');

    let detailsAdmin;
    try {
        const fs = require('fs');

        let serviceAccount;
        if (process.env.FIREBASE_DETAILS_SERVICE_ACCOUNT) {
            serviceAccount = JSON.parse(process.env.FIREBASE_DETAILS_SERVICE_ACCOUNT);
        } else {
            const serviceAccountPath = path.join(__dirname, '../../ServiceAccountMaster.json');
            if (fs.existsSync(serviceAccountPath)) {
                serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
                console.log('✓ Using service account from: root/ServiceAccountMaster.json');
            } else {
                const legacyPath = path.join(__dirname, '../Serviceaccount1.json');
                if (fs.existsSync(legacyPath)) {
                    serviceAccount = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
                    console.log('✓ Using legacy service account from: backend/Serviceaccount1.json');
                } else {
                    throw new Error('Firebase Service Account not found in environment or local file.');
                }
            }
        }

        const databaseURL = process.env.FIREBASE_DATABASE_URL;
        const collectionPath = process.env.FIREBASE_DETAILS_PATH || 'HYD-DERs'; // Updated default

        detailsAdmin = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: databaseURL
        }, 'detailsApp');

        console.log('✓ Firebase Details Admin initialized');

        console.log(`🚀 Fetching data from Firebase path: ${collectionPath}...`);
        const snapshot = await detailsAdmin.database().ref(collectionPath).once('value');
        const firebaseData = snapshot.val();

        if (!firebaseData) {
            console.log('⚠️ No data found in Firebase path.');
            return { inserted: 0, updated: 0, failed: 0 };
        }

        // Get MongoDB URIs from environment
        const mongoUriOld = process.env.MONGO_URI;
        const mongoUriNew = process.env.MONGODB_URI_NEW;

        if (!mongoUriOld) throw new Error('MONGO_URI is missing in .env');
        if (!mongoUriNew) throw new Error('MONGODB_URI_NEW is missing in .env');

        const dbName = 'hike_dashboard_db';

        // Process each month separately
        const months = Object.entries(firebaseData);
        console.log(`📊 Found ${months.length} months/nodes to sync.`);

        // Helper function to sync to a specific database
        async function syncToDatabase(mongoUri, dbLabel) {
            console.log(`\n========================================`);
            console.log(`🔄 Syncing to ${dbLabel} MongoDB Database`);
            console.log(`========================================`);

            const { MongoClient } = require('mongodb');
            const client = new MongoClient(mongoUri);

            try {
                await client.connect();
                const db = client.db(dbName);
                console.log(`✓ Connected to ${dbLabel} MongoDB: ${dbName}`);

                let totalInserted = 0;
                let totalUpdated = 0;

                for (const [monthYear, monthData] of months) {
                    if (!monthData || typeof monthData !== 'object') continue;

                    const collectionName = formatCollectionName(monthYear);
                    console.log(`📂 Syncing month "${monthYear}" to collection "${collectionName}"`);

                    // Ensure indexes for this specific month's collection
                    await ensureIndexes(collectionName, db);
                    const collection = db.collection(collectionName);

                    const operations = Object.entries(monthData).map(([recordId, data]) => {
                        const transformedData = {
                            name: data.email || 'Unknown',
                            date: data.lastUpdated ? new Date(data.lastUpdated) : new Date(),
                            target: Number(data.amount) || 0,
                            points: 0,
                            admissions: 1,
                            achievementPercentage: 0,
                            status: data.status || 'Pending',
                            university: data.university,
                            feeType: data.feeType,
                            monthYear: monthYear,
                            source: "firebase",
                            updatedAt: new Date()
                        };

                        return {
                            updateOne: {
                                filter: { recordId: recordId },
                                update: {
                                    $set: transformedData,
                                    $setOnInsert: { recordId: recordId, createdAt: new Date() }
                                },
                                upsert: true
                            }
                        };
                    });

                    if (operations.length > 0) {
                        const result = await collection.bulkWrite(operations);
                        totalInserted += result.upsertedCount;
                        totalUpdated += result.modifiedCount;
                        console.log(`   ✅ ${monthYear}: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`);
                    }
                }

                console.log(`--- ${dbLabel} Sync Summary ---`);
                console.log(`✅ Total Inserted: ${totalInserted}`);
                console.log(`🔄 Total Updated: ${totalUpdated}`);
                console.log('----------------------------');

                return { inserted: totalInserted, updated: totalUpdated };
            } finally {
                await client.close();
            }
        }

        // Sync to OLD database
        const oldResults = await syncToDatabase(mongoUriOld, 'OLD');

        // Sync to NEW database
        const newResults = await syncToDatabase(mongoUriNew, 'NEW');

        console.log('\n\x1b[32m✔ Details Sync completed successfully for BOTH databases.\x1b[0m');

        return {
            inserted: oldResults.inserted + newResults.inserted,
            updated: oldResults.updated + newResults.updated,
            failed: 0
        };

    } catch (error) {
        console.error('❌ Sync failed with error:', error);
        throw error;
    } finally {
        if (detailsAdmin) {
            await detailsAdmin.delete();
        }
    }
}

if (require.main === module) {
    firebaseSync()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = firebaseSync;
