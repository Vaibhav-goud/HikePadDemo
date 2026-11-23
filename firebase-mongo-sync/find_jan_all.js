import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const serviceAccountPath = path.join(__dirname, '..', 'ServiceAccountMaster.json');

async function findTheOneRecord() {
    const data = await readFile(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(data);

    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });
    }

    const ref = admin.database().ref('MUM-DERs');
    const snapshot = await ref.once('value');
    const dataVal = snapshot.val();

    const allRecords = [];
    const traverse = (node) => {
        if (!node || typeof node !== 'object') return;
        if (node['REG NO_ APP NO'] || node['REG NO / APP NO'] || node['Candidate Name'] || node['regNo']) {
            allRecords.push(node);
            return;
        }
        Object.values(node).forEach(traverse);
    };
    traverse(dataVal);

    allRecords.forEach(r => {
        const dateStr = JSON.stringify(r).toLowerCase();
        if (dateStr.includes('/01/2026') || dateStr.includes('-01-2026') || dateStr.includes('jan')) {
            let type = (r['Registration_Admission'] || r['Registration/Admission'] || '').toLowerCase();
            if (type.includes('admission')) {
                // Print basic info for matching manual verification
                console.log(`Match: ${r['Candidate Name']} | ${r['Date of Admission'] || r['Date of Registration']} | ${r['Registration_Admission'] || r['Registration/Admission']}`);
            }
        }
    });

    process.exit(0);
}

findTheOneRecord();
