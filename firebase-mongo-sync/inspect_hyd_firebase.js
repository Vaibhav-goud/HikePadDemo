import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

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
        } else if (p0 > 1000 && p1 <= 12 && p2 <= 31) {
            const d = new Date(p0, p1 - 1, p2);
            if (!isNaN(d.getTime())) return d;
        }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    return null;
};

async function inspect() {
    const data = await readFile(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(data);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    const ref = admin.database().ref('HYD-DERs');
    const snapshot = await ref.once('value');
    const rootData = snapshot.val();

    if (!rootData) {
        console.log("No data in HYD-DERs");
        return;
    }

    console.log("Root keys in HYD-DERs:", Object.keys(rootData));
    // Check if there are keys that look like months or dates
    const nestedKeys = {};
    Object.keys(rootData).forEach(k => {
        if (rootData[k] && typeof rootData[k] === 'object') {
            nestedKeys[k] = Object.keys(rootData[k]).slice(0, 5);
        }
    });
    console.log("First few keys of children:", nestedKeys);

    const allRecords = [];
    const processNode = (node) => {
        if (!node || typeof node !== 'object') return;
        if (node['REG NO / APP NO'] || node['Candidate Name'] || node['regNo'] || node['REG NO_ APP NO']) {
            allRecords.push(node);
            return;
        }
        Object.values(node).forEach(child => processNode(child));
    };

    processNode(rootData);

    const counts = {};
    const regNos = new Set();
    const duplicates = [];

    allRecords.forEach(record => {
        let type = (record['Registration_Admission'] || record['Registration/Admission'] || record.registrationType || '').trim();
        if (!type.toLowerCase().includes('admission')) return;

        const regDate = parseDate(record['Date of Registration']);
        const admDate = parseDate(record['Date of Admission']) || parseDate(record.date);
        const date = admDate || regDate;

        if (date) {
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            counts[key] = (counts[key] || 0) + 1;
        }

        const regNo = record['REG NO_ APP NO'] || record['REG NO / APP NO'] || record.regNo || record.uid;
        if (regNo) {
            if (regNos.has(regNo)) {
                duplicates.push(regNo);
            }
            regNos.add(regNo);
        }
    });

    console.log("Firebase HYD-DERs Admissions Count by Month:");
    Object.keys(counts).sort().forEach(k => {
        console.log(`- ${k}: ${counts[k]}`);
    });

    console.log("\nTotal Records Found:", allRecords.length);
    console.log("Duplicate RegNos:", duplicates.length);
    if (duplicates.length > 0) {
        console.log("Samples:", duplicates.slice(0, 5));
    }

    admin.app().delete();
}

inspect();
