import admin from 'firebase-admin';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const serviceAccountPath = path.join(__dirname, '..', 'ServiceAccountMaster.json');

const mongoUri = process.env.MONGO_URI;
const dbName = 'hike_dashboard_db';

let mongoClient;
let db;

/**
 * Normalization utility (copied from backend/utils/normalization.js for self-containment)
 */
const normalizeName = (name) => {
    if (!name || typeof name !== 'string') return '';

    const oldLogicResult = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')           // Collapse multiple spaces
        .replace(/[^a-z0-9\s]/g, '');   // Remove special characters

    const parts = oldLogicResult.split(' ');

    // Find the first part that is not an initial (length > 1)
    const firstName = parts.find(p => p.length > 1) || parts[0] || '';

    // Exception list for first names that refer to multiple distinct people (e.g. Yash B, Yash S)
    const exceptions = ['yash', 'harsh', 'sakshi', 'mohit', 'shubham', 'aditya', 'shaik'];
    if (exceptions.includes(firstName)) {
        return oldLogicResult;
    }

    return firstName;
};

const normalizeSource = (source) => {
    if (!source || typeof source !== 'string') return '';
    return source.trim().toLowerCase().replace(/\s+/g, ' ');
};

async function syncBranch(config) {
    const reportsRef = admin.database().ref(config.firebasePath);
    const collection = db.collection(config.mongoCollection);

    console.log(`\x1b[36m🚀 Fetching KRA data from Firebase ${config.firebasePath}...\x1b[0m`);

    const snapshot = await reportsRef.once('value');
    const data = snapshot.val();

    if (!data) {
        console.log(`No data found in ${config.firebasePath} or node is empty.`);
        return;
    }

    console.log(`\x1b[34m[${new Date().toLocaleTimeString()}] Processing KRA logs for ${config.branchCode}...\x1b[0m`);

    const allRecords = [];
    const logsData = data.daily_logs || data;
    Object.entries(logsData).forEach(([date, dayLogs]) => {
        if (dayLogs && typeof dayLogs === 'object') {
            Object.entries(dayLogs).forEach(([uid, report]) => {
                allRecords.push({ uid, report });
            });
        }
    });

    const operations = allRecords.map(({ uid, report }) => {
        const reportId = report.uid || uid;
        const { _id, ...reportData } = report;

        // Apply new normalization and store both versions
        if (reportData.name) {
            reportData.originalName = reportData.name;
            reportData.normalizedName = normalizeName(reportData.name);
            // Maintain 'name' for backward compatibility
            reportData.name = reportData.name.trim();
        }

        // Also normalize Team Leader if present
        if (reportData.teamLeader) {
            reportData.teamLeaderNormalized = normalizeName(reportData.teamLeader);
        }

        return {
            updateOne: {
                filter: { report_id: reportId },
                update: {
                    $set: {
                        ...reportData,
                        report_id: reportId,
                        branch: config.branchName,
                        branchCode: config.branchCode,
                        last_synced: new Date()
                    }
                },
                upsert: true
            }
        };
    });

    if (operations.length > 0) {
        try {
            // Clean up any previously created invalid date-based aggregate documents
            const deleteResult = await collection.deleteMany({ report_id: /^\d{4}-\d{2}-\d{2}$/ });
            if (deleteResult.deletedCount > 0) {
                console.log(`   └─ Cleaned up ${deleteResult.deletedCount} invalid date-aggregate documents.`);
            }
            const result = await collection.bulkWrite(operations);
            console.log(`   └─ \x1b[32m${config.branchCode} Sync Result: ${result.upsertedCount} new, ${result.modifiedCount} updated.\x1b[0m`);
        } catch (error) {
            console.error(`\x1b[31m   └─ ${config.branchCode} Error during MongoDB bulkWrite:\x1b[0m`, error.message);
            throw error;
        }
    }
}

/**
 * Helper to parse dates robustly
 */
const parseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;

    // Try DD/MM/YYYY or DD-MM-YYYY first as it's the standard for the source data
    const parts = dateStr.trim().split(/[\/-]/);
    if (parts.length === 3) {
        const p0 = parseInt(parts[0]);
        const p1 = parseInt(parts[1]);
        const p2 = parseInt(parts[2]);

        // If it looks like DD/MM/YYYY
        if (p0 <= 31 && p1 <= 12 && p2 > 1000) {
            const d = new Date(p2, p1 - 1, p0);
            if (!isNaN(d.getTime())) return d;
        }
        // If it looks like YYYY/MM/DD
        else if (p0 > 1000 && p1 <= 12 && p2 <= 31) {
            const d = new Date(p0, p1 - 1, p2);
            if (!isNaN(d.getTime())) return d;
        }
    }

    // Fallback to native parser only as last resort
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    return null;
};

async function init() {
    try {
        // 1. Check for Service Account Key
        let serviceAccount;
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                console.log('\x1b[32m✔ Firebase Service Account loaded from environment variable.\x1b[0m');
            } catch (err) {
                console.error('\x1b[31mError parsing FIREBASE_SERVICE_ACCOUNT environment variable:\x1b[0m', err.message);
                process.exit(1);
            }
        } else {
            console.log('\x1b[33mFIREBASE_SERVICE_ACCOUNT not found in env, checking local file...\x1b[0m');
            try {
                const data = await readFile(serviceAccountPath, 'utf8');
                serviceAccount = JSON.parse(data);
                console.log('\x1b[32m✔ Firebase Service Account loaded from local file.\x1b[0m');
            } catch (err) {
                console.error('\x1b[31mError: serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT env var is missing.\x1b[0m');
                process.exit(1);
            }
        }

        // 2. Initialize Firebase Admin
        if (!process.env.FIREBASE_DATABASE_URL) {
            console.error('\x1b[31mError: FIREBASE_DATABASE_URL not found in .env\x1b[0m');
            process.exit(1);
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });

        console.log('\x1b[32m✔ Firebase Admin initialized.\x1b[0m');

        // 3. Connect to MongoDB
        console.log('Connecting to MongoDB Atlas...');
        mongoClient = new MongoClient(mongoUri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000
        });
        await mongoClient.connect();
        db = mongoClient.db(dbName);
        console.log(`\x1b[32m✔ Connected to MongoDB Database: ${dbName}\x1b[0m`);

        // 4. Perform Sync Tasks

        // KRA Sync Configuration
        const kraConfigs = [
            { firebasePath: 'KRA-HYD', mongoCollection: 'KRA_Reports_HYD', branchCode: 'HYD', branchName: 'Hyderabad Branch' },
            { firebasePath: 'KRA-MUM', mongoCollection: 'KRA_Reports_MUM', branchCode: 'MUM', branchName: 'Mumbai Branch' }
        ];

        for (const config of kraConfigs) {
            await syncBranch(config);
        }

        // Admissions Sync Configuration
        const admissionsConfigs = [
            { firebasePath: 'HYD-DERs', mongoCollection: 'HYD-ADM', branch: 'HYD' },
            { firebasePath: 'MUM-DERs', mongoCollection: 'MUM-ADM', branch: 'MUM' }
        ];

        for (const config of admissionsConfigs) {
            await syncAdmissions(config);
        }

        console.log('\x1b[32m✔ All Sync tasks completed successfully.\x1b[0m');

        // 5. Cleanup and Exit
        await mongoClient.close();
        process.exit(0);

    } catch (error) {
        console.error('\x1b[31mFATAL: Execution failed:\x1b[0m', error);
        if (mongoClient) await mongoClient.close();
        process.exit(1);
    }
}

/**
 * Sync Detailed Admissions Data (Updated to handle branch config)
 */
async function syncAdmissions(config) {
    const firebasePath = config.firebasePath;
    const admissionsRef = admin.database().ref(firebasePath);
    const collection = db.collection(config.mongoCollection);

    console.log(`\x1b[36m🚀 Fetching Detailed Admissions from Firebase ${firebasePath}...\x1b[0m`);

    const snapshot = await admissionsRef.once('value');
    const data = snapshot.val();

    if (!data) {
        console.log(`No data found in ${firebasePath} or node is empty.`);
        return;
    }

    // Flatten data if nested by month/date
    const allRecords = [];
    const processNode = (node) => {
        if (!node || typeof node !== 'object') return;

        // Check if it's a leaf node (has REG NO or candidate name)
        if (node['REG NO / APP NO'] || node['Candidate Name'] || node['regNo']) {
            allRecords.push(node);
            return;
        }

        // Recursively process children
        Object.values(node).forEach(child => processNode(child));
    };

    processNode(data);

    console.log(`\x1b[34m[${new Date().toLocaleTimeString()}] Processing ${allRecords.length} records for ${config.branch}...\x1b[0m`);

    const operations = allRecords.map((record) => {
        try {
            let regType = (record['Registration_Admission'] || record['Registration/Admission'] || record.registrationType || '').trim();
            if (regType.toLowerCase().includes('admission')) regType = 'Admissions';
            else if (regType.toLowerCase().includes('registration')) regType = 'Registration';

            const doc = {
                registrationType: regType,
                regNo: record['REG NO_ APP NO'] || record['REG NO / APP NO'] || record.regNo || record.uid,
                registrationDate: parseDate(record['Date of Registration']),
                admissionDate: parseDate(record['Date of Admission']) || parseDate(record.date),
                teamLeadName: record['Team Lead Name'] || record.teamLeadName,
                bdeName: record['BDE Name'] || record.bdeName || record.name,
                candidateName: record['Candidate Name'] || record.candidateName,
                universityName: record['University Name'] || record.universityName || record.university,
                programName: record['Program Name'] || record.programName,
                amount: parseFloat(record['Amount '] || record['Amount'] || record.amount || 0) || 0,
                paymentMode: record['Mode of payment (Loan_Online_DD)-Admission'] || record['Mode of payment (Loan/Online/DD)-Admission'] || record.paymentMode,
                feeType: record['Fee Type'] || record.feeType,
                sourceOfAdmission: record['Source of admission'] || record.sourceOfAdmission,
                points: parseFloat(record['Points'] || record.points || 0) || 0,
                formStatus: record['Form Status'] || record.formStatus,
                admissionStatus: ((record['Admission Status'] || record.admissionStatus || record.status || '').trim() === 'Admission Approved' ? 'Approved' : (record['Admission Status'] || record.admissionStatus || record.status || '').trim()),
                branch: config.branch, // Use branch from config
                last_synced: new Date()
            };

            // Apply normalization
            doc.teamLeadNameNormalized = normalizeName(doc.teamLeadName);
            doc.bdeNameNormalized = normalizeName(doc.bdeName);
            doc.candidateNameNormalized = normalizeName(doc.candidateName);
            doc.sourceOfAdmission = normalizeSource(doc.sourceOfAdmission);

            // Filter out if no regNo
            if (!doc.regNo) return null;

            return {
                updateOne: {
                    filter: { regNo: doc.regNo },
                    update: { $set: doc },
                    upsert: true
                }
            };
        } catch (err) {
            console.error(`Error processing individual record:`, err.message, record);
            return null;
        }
    }).filter(op => op !== null);

    if (operations.length > 0) {
        try {
            const result = await collection.bulkWrite(operations);
            console.log(`   └─ \x1b[32m${config.branch} Admissions Sync: ${result.upsertedCount} new, ${result.modifiedCount} updated.\x1b[0m`);
        } catch (error) {
            console.error(`\x1b[31m   └─ Error during ${config.branch} Admissions bulkWrite:\x1b[0m`, error.message);
            throw error;
        }
    }
}

init();
