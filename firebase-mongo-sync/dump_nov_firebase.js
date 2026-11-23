import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
const serviceAccountPath = path.resolve(__dirname, '..', 'ServiceAccountMaster.json');

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
        } else if (p0 > 1000 && p1 <= 12 && p2 <= 31) {
            const d = new Date(p0, p1 - 1, p2);
            if (!isNaN(d.getTime())) return d;
        }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    return null;
};

async function dump() {
    const data = await readFile(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(data);

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });
    }

    const ref = admin.database().ref('HYD-DERs');
    const snapshot = await ref.once('value');
    const rootData = snapshot.val();

    const allNov = [];
    const processNode = (node) => {
        if (!node || typeof node !== 'object') return;
        if (node['REG NO / APP NO'] || node['Candidate Name'] || node['regNo'] || node['REG NO_ APP NO']) {
            const regDate = parseDate(node['Date of Registration']);
            const admDate = parseDate(node['Date of Admission']) || parseDate(node.date);
            const date = admDate || regDate;
            if (date && date.getUTCFullYear() === 2025 && date.getUTCMonth() === 10) {
                allNov.push(node);
            }
            return;
        }
        Object.values(node).forEach(child => processNode(child));
    };

    processNode(rootData);

    console.log(`All Nov 2025 UTC records (${allNov.length}):`);
    allNov.forEach(r => {
        let type = (r['Registration_Admission'] || r['Registration/Admission'] || r.registrationType || '').trim();
        console.log(`- ${r['REG NO / APP NO'] || r.regNo || r['REG NO_ APP NO']} | ${r['Candidate Name']} | Type: [${type}] | ADM: ${r['Date of Admission'] || r.date}`);
    });

    admin.app().delete();
}

dump();
