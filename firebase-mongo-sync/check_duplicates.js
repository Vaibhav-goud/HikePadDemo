import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const serviceAccountPath = path.join(__dirname, '..', 'ServiceAccountMaster.json');

// Helper to parse dates like the sync script
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

async function checkDuplicates() {
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
        if (node['REG NO_ APP NO'] || node['REG NO / APP NO'] || node['Candidate Name']) {
            allRecords.push(node);
            return;
        }
        Object.values(node).forEach(traverse);
    };
    traverse(dataVal);

    let regMap = new Map();
    let duplicates = [];

    allRecords.forEach(r => {
        let type = (r['Registration_Admission'] || r['Registration/Admission'] || '').toLowerCase();
        if (!type.includes('admission')) return;

        const dateStr = r['Date of Admission'] || r['Date of Registration'];
        const date = parseDate(dateStr);

        if (date && date.getMonth() === 1 && date.getFullYear() === 2026) {
            const reg = r['REG NO_ APP NO'] || r['REG NO / APP NO'] || r.regNo;
            if (regMap.has(reg)) {
                duplicates.push({ reg, name1: regMap.get(reg).name, name2: r['Candidate Name'] });
            } else {
                regMap.set(reg, { name: r['Candidate Name'] });
            }
        }
    });

    console.log(`Verified Feb Admissions in Firebase: ${regMap.size} unique Reg Nos, ${duplicates.length} duplicates.`);
    if (duplicates.length > 0) {
        console.log('Duplicate Records:');
        duplicates.forEach(d => console.log(`- Reg: ${d.reg}, Names: ${d.name1} & ${d.name2}`));
    }

    process.exit(0);
}

checkDuplicates();
