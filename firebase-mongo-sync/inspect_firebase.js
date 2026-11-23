import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const serviceAccountPath = path.join(__dirname, '..', 'ServiceAccountMaster.json');

// Helper to parse DD/MM/YYYY or MM/DD/YYYY
function parseDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;

    // Most likely DD/MM/YYYY based on sample
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);

    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
}

async function inspectFirebase() {
    const data = await readFile(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(data);

    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });
    }

    const ref = admin.database().ref('MUM-DERs');
    console.log('Fetching all records from MUM-DERs...');
    const snapshot = await ref.once('value');
    const records = snapshot.val();

    if (!records) {
        console.log('No data.');
        process.exit(0);
    }

    const allRecords = [];
    const traverse = (node) => {
        if (!node || typeof node !== 'object') return;
        if (node['REG NO_ APP NO'] || node['REG NO / APP NO'] || node['Candidate Name']) {
            allRecords.push(node);
            return;
        }
        Object.values(node).forEach(traverse);
    };
    traverse(records);

    console.log(`Total records found in Firebase: ${allRecords.length}`);

    const febStats = {
        total: 0,
        admissions: 0,
        registrations: 0,
        other: 0,
        dateIssues: 0
    };

    allRecords.forEach(r => {
        const dateStr = r['Date of Admission'] || r['Date of Registration'];
        const date = parseDate(dateStr);

        if (date && date.getMonth() === 1 && date.getFullYear() === 2026) {
            febStats.total++;
            let type = (r['Registration_Admission'] || r['Registration/Admission'] || '').toLowerCase();
            if (type.includes('admission')) febStats.admissions++;
            else if (type.includes('registration')) febStats.registrations++;
            else febStats.other++;
        } else if (!date) {
            febStats.dateIssues++;
        }
    });

    console.log('Firebase Stats for Feb 2026:');
    console.log(JSON.stringify(febStats, null, 2));

    process.exit(0);
}

inspectFirebase();
