require('dotenv').config();
const admin = require('firebase-admin');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

async function syncKRAData() {
    console.log('--- Starting Firebase KRA Data Sync for Cluster0 (Main) ---');

    const serviceAccountPath = path.join(__dirname, '../../ServiceAccountMaster.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    const databaseURL = "https://master-836ba-default-rtdb.asia-southeast1.firebasedatabase.app/";

    // Initialize Firebase
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: databaseURL
        });
    }

    const mongoUri = process.env.MONGODB_URI;
    const dbName = 'hike_dashboard_db';
    const client = new MongoClient(mongoUri);

    try {
        await client.connect();
        const db = client.db(dbName);
        console.log(`✓ Connected to Cluster0 MongoDB: ${dbName}`);

        const syncConfigs = [
            {
                path: 'KRA-HYD',
                collection: 'KRA_Reports_HYD',
                branchName: 'Hyderabad Branch',
                branchCode: 'HYD'
            },
            {
                path: 'KRA-MUM',
                collection: 'KRA_Reports_MUM',
                branchName: 'Mumbai Branch',
                branchCode: 'MUM'
            }
        ];

        for (const config of syncConfigs) {
            console.log(`🚀 Fetching data from: ${config.path}...`);
            const snapshot = await admin.database().ref(config.path).once('value');
            const data = snapshot.val();

            if (!data) {
                console.log(`No data found in ${config.path}.`);
                continue;
            }

            const collection = db.collection(config.collection);
            const allOperations = [];

            // Normalized function to process a "day of logs"
            const processDay = (dateKey, users) => {
                if (!users || typeof users !== 'object') return;

                Object.entries(users).forEach(([uid, report]) => {
                    if (!report || typeof report !== 'object') return;

                    // Basic validation that this looks like a report (has a name)
                    if (!report.name && !report.performer) return;

                    let normalizedName = report.name || report.performer;
                    if (normalizedName && typeof normalizedName === 'string') {
                        normalizedName = normalizedName.trim().replace(/\b\w/g, c => c.toUpperCase());
                    }

                    const reportId = report.uid || uid;
                    const doc = {
                        ...report,
                        name: normalizedName,
                        report_id: reportId,
                        branch: config.branchName,
                        branchCode: config.branchCode,
                        date: dateKey,
                        last_synced: new Date()
                    };
                    delete doc._id;

                    allOperations.push({
                        updateOne: {
                            filter: { report_id: reportId, date: dateKey },
                            update: { $set: doc },
                            upsert: true
                        }
                    });
                });
            };

            // Detect if root has 'daily_logs' or is directly dates
            if (data.daily_logs) {
                console.log(`  ✓ Found daily_logs folder, syncing sub-nodes...`);
                Object.entries(data.daily_logs).forEach(([dateKey, users]) => {
                    processDay(dateKey, users);
                });
            } else {
                // Check if keys look like dates (YYYY-MM-DD or similar)
                Object.entries(data).forEach(([dateKey, users]) => {
                    if (dateKey.match(/^\d{4}-\d{2}-\d{2}/)) {
                        processDay(dateKey, users);
                    }
                });
            }

            if (allOperations.length > 0) {
                const result = await collection.bulkWrite(allOperations);
                console.log(`   ✅ ${config.branchCode}: ${result.upsertedCount} new, ${result.modifiedCount} updated.`);
            } else {
                console.log(`   ⚠️ ${config.branchCode}: No records found.`);
            }
        }

        console.log('\n\x1b[32m✔ KRA Sync completed successfully for Cluster0.\x1b[0m');

    } catch (error) {
        console.error('❌ KRA Sync failed:', error);
    } finally {
        await client.close();
        if (admin.apps.length > 0) await admin.app().delete();
        process.exit(0);
    }
}

syncKRAData();
