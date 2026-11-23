import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const serviceAccountPath = path.join(__dirname, '..', 'ServiceAccountMaster.json');

const parseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.trim().split(/[\/-]/);
    if (parts.length === 3) {
        const p0 = parseInt(parts[0]);
        const p1 = parseInt(parts[1]);
        const p2 = parseInt(parts[2]);
        if (p0 <= 31 && p1 <= 12 && p2 > 1000) {
            const d = new Date(p2, p1 - 1, p0);
            if (!isNaN(d.getTime())) return d;
        }
    }
    return null;
};

async function checkDecFirebase() {
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

    let dec2025Admissions = 0;
    let otherDecAdmissions = 0;
    let totalAdmissionsNodeCount = 0;

    allRecords.forEach(r => {
        let type = (r['Registration_Admission'] || r['Registration/Admission'] || '').toLowerCase();
        if (!type.includes('admission')) return;
        totalAdmissionsNodeCount++;

        const dateStr = r['Date of Admission'] || r['Date of Registration'];
        const date = parseDate(dateStr);

        if (date && date.getMonth() === 11) { // Dec is 11
            if (date.getFullYear() === 2025) {
                dec2025Admissions++;
            } else {
                otherDecAdmissions++;
            }
        } else if (dateStr && (dateStr.includes('/12/') || dateStr.includes('-12-'))) {
            console.log(`Potential Dec Date Parse Fail: ${dateStr}`);
        }
    });

    console.log(`Firebase Dec 2025 Mumbai Admissions: ${dec2025Admissions}`);
    console.log(`Total Admission-type records found: ${totalAdmissionsNodeCount}`);
    process.exit(0);
}

checkDecFirebase();
