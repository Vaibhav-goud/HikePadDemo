const admin = require('firebase-admin');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const serviceAccountPath = path.join(__dirname, '../../ServiceAccountMaster.json');

const mongoUri = process.env.MONGO_URI;
const dbName = 'hike_dashboard_db'; // Match the main application database

let mongoClient;
let db;

async function syncBranch(config) {
    if (!config.firebaseRef) {
        console.error(`❌ Missing firebaseRef for ${config.branchCode}`);
        return;
    }

    console.log(`\x1b[36m🚀 Fetching data from Firebase ${config.firebasePath}...\x1b[0m`);

    const snapshot = await config.firebaseRef.once('value');
    const data = snapshot.val();

    if (!data) {
        console.log(`No data found in ${config.firebasePath} or node is empty.`);
        return;
    }

    console.log(`\x1b[34m[${new Date().toLocaleTimeString()}] Found data for ${config.branchCode}, processing...\x1b[0m`);

    const collection = db.collection(config.mongoCollection);
    const allOperations = [];

    // Iterate through dates (e.g., "2024-10-25")
    Object.entries(data).forEach(([dateKey, dayLogs]) => {
        if (!dayLogs || typeof dayLogs !== 'object') return;

        // Iterate through users (UIDs) within that date
        Object.entries(dayLogs).forEach(([uid, report]) => {
            // Some reports might be keyed by push ID or UID directly. 
            // Adjust logic based on your exact structure. 
            // The user snippet suggests: Object.entries(dayLogs).forEach(([uid, report]) => { allRecords.push(...) })

            // Normalize Name
            let normalizedName = report.name;
            if (normalizedName && typeof normalizedName === 'string') {
                normalizedName = normalizedName.trim().replace(/\b\w/g, c => c.toUpperCase());
            }

            // Construct unique ID for MongoDB (composite key or use firebase ID)
            // Using a combination of date and UID/ReportID to ensure uniqueness if needed, 
            // or trust the 'uid' field if it's unique per day.
            // The user logic used `report.uid || uid` as `report_id`.
            const reportId = report.uid || uid;

            // Prepare the document
            const doc = {
                ...report,
                name: normalizedName,
                report_id: reportId,
                branch: config.branchName,
                branchCode: config.branchCode,
                date: dateKey, // Important to keep reference to the date key
                last_synced: new Date()
            };

            // Remove _id if it exists in source to avoid collision
            delete doc._id;

            allOperations.push({
                updateOne: {
                    filter: { report_id: reportId, date: dateKey }, // Assuming unique per user per day?
                    update: { $set: doc },
                    upsert: true
                }
            });
        });
    });

    if (allOperations.length > 0) {
        try {
            const result = await collection.bulkWrite(allOperations);
            console.log(`   └─ \x1b[32m${config.branchCode} Sync Result: ${result.upsertedCount} new, ${result.modifiedCount} updated.\x1b[0m`);
        } catch (error) {
            console.error(`\x1b[31m   └─ ${config.branchCode} Error during MongoDB bulkWrite:\x1b[0m`, error.message);
        }
    } else {
        console.log(`   └─ \x1b[33m${config.branchCode} No records to sync.\x1b[0m`);
    }
}

async function init() {
    try {
        console.log('--- Starting Firebase KRA Data Sync ---');

        // 1. Initialize Firebase Admin
        // Try KRA-specific env var first, then general one, then local files
        let serviceAccount;

        // Check for KRA-specific service account in env
        if (process.env.FIREBASE_KRA_SERVICE_ACCOUNT) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_KRA_SERVICE_ACCOUNT);
                console.log('✓ Using KRA service account from ENV (FIREBASE_KRA_SERVICE_ACCOUNT)');
            } catch (e) {
                console.error('Failed to parse FIREBASE_KRA_SERVICE_ACCOUNT');
            }
        }

        // Fall back to general service account env var
        if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                console.log('✓ Using service account from ENV (FIREBASE_SERVICE_ACCOUNT)');
            } catch (e) {
                console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT');
            }
        }

        // Check for KRA-specific local file
        const kraServiceAccountPath = path.join(__dirname, '../ServiceAccountKRA.json');
        if (!serviceAccount && fs.existsSync(kraServiceAccountPath)) {
            serviceAccount = require(kraServiceAccountPath);
            console.log('✓ Using KRA service account from local file (ServiceAccountKRA.json)');
        }

        // Fall back to main service account file
        if (!serviceAccount && fs.existsSync(serviceAccountPath)) {
            serviceAccount = require(serviceAccountPath);
            console.log('✓ Using service account from local file (Serviceaccount1.json)');
            console.log('⚠️  WARNING: This may not have access to the KRA Firebase database');
        }

        if (!serviceAccount) {
            throw new Error('No valid Firebase Service Account credentials found.');
        }

        const databaseURL = process.env.FIREBASE_DATABASE_URL; // e.g. https://hike-education-default-rtdb.firebaseio.com

        if (!databaseURL) {
            throw new Error('FIREBASE_DATABASE_URL is missing in .env');
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: databaseURL
        });

        console.log('✓ Firebase Admin initialized.');

        // 2. Get MongoDB URIs from environment
        const mongoUriOld = process.env.MONGO_URI;
        const mongoUriNew = process.env.MONGODB_URI_NEW;

        if (!mongoUriOld) throw new Error('MONGO_URI is missing in .env');
        if (!mongoUriNew) throw new Error('MONGODB_URI_NEW is missing in .env');

        // 3. Define Sync Configs
        // Note: We need to access specific paths in the Realtime Database
        const dbRef = admin.database();

        const syncConfigs = [
            {
                firebasePath: 'KRA-HYD',
                firebaseRef: dbRef.ref('KRA-HYD'),
                mongoCollection: 'KRA_Reports_HYD',
                branchCode: 'HYD',
                branchName: 'Hyderabad Branch'
            },
            {
                firebasePath: 'KRA-MUM',
                firebaseRef: dbRef.ref('KRA-MUM'),
                mongoCollection: 'KRA_Reports_MUM',
                branchCode: 'MUM',
                branchName: 'Mumbai Branch'
            }
        ];

        // 4. Sync to OLD database
        console.log('\n========================================');
        console.log('🔄 Syncing to OLD MongoDB Database');
        console.log('========================================');

        mongoClient = new MongoClient(mongoUriOld);
        await mongoClient.connect();
        db = mongoClient.db(dbName);
        console.log(`✓ Connected to OLD MongoDB: ${dbName}`);

        for (const config of syncConfigs) {
            await syncBranch(config);
        }

        await mongoClient.close();
        console.log('✓ OLD database sync completed\n');

        // 5. Sync to NEW database
        console.log('========================================');
        console.log('🔄 Syncing to NEW MongoDB Database');
        console.log('========================================');

        mongoClient = new MongoClient(mongoUriNew);
        await mongoClient.connect();
        db = mongoClient.db(dbName);
        console.log(`✓ Connected to NEW MongoDB: ${dbName}`);

        for (const config of syncConfigs) {
            await syncBranch(config);
        }

        console.log('\n\x1b[32m✔ KRA Sync completed successfully for BOTH databases.\x1b[0m');

    } catch (error) {
        console.error('\x1b[31mFATAL: Execution failed:\x1b[0m', error);
        process.exit(1);
    } finally {
        if (mongoClient) await mongoClient.close();
        // admin.app().delete() is sometimes needed if script hangs, but usually process.exit handles it
        process.exit(0);
    }
}

init();
