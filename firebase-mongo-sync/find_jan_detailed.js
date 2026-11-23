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

async function checkJanMumbaiFirebase() {
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

    let jan2026Admissions = 0;
    let janOtherYearAdmissions = 0;
    let registrationsInJan2026 = 0;

    allRecords.forEach(r => {
        const dateStr = r['Date of Admission'] || r['Date of Registration'];
        const date = parseDate(dateStr);
        let type = (r['Registration_Admission'] || r['Registration/Admission'] || '').toLowerCase();

        if (date && date.getMonth() === 0) {
            if (date.getFullYear() === 2026) {
                if (type.includes('admission')) jan2026Admissions++;
                else if (type.includes('registration')) registrationsInJan2026++;
            } else {
                if (type.includes('admission')) janOtherYearAdmissions++;
            }
        }
    });

    console.log(`Jan 2026 Admissions: ${jan2026Admissions}`);
    console.log(`Jan Other Year Admissions: ${janOtherYearAdmissions}`);
    console.log(`Jan 2026 Registrations: ${registrationsInJan2026}`);

    process.exit(0);
}

checkJanMumbaiFirebase();
