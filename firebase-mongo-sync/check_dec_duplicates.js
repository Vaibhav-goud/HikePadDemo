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

async function check() {
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

    const decAdmissions = [];
    const processNode = (node) => {
        if (!node || typeof node !== 'object') return;
        if (node['REG NO / APP NO'] || node['Candidate Name'] || node['regNo'] || node['REG NO_ APP NO']) {
            let type = (node['Registration_Admission'] || node['Registration/Admission'] || node.registrationType || '').trim();
            if (type.toLowerCase().includes('admission')) {
                const regDate = parseDate(node['Date of Registration']);
                const admDate = parseDate(node['Date of Admission']) || parseDate(node.date);
                const date = admDate || regDate;
                if (date && date.getFullYear() === 2025 && date.getMonth() === 11) {
                    decAdmissions.push(node);
                }
            }
            return;
        }
        Object.values(node).forEach(child => processNode(child));
    };

    processNode(rootData);

    const names = decAdmissions.map(r => r['Candidate Name'] || r.candidateName);
    const regNos = decAdmissions.map(r => String(r['REG NO_ APP NO'] || r['REG NO / APP NO'] || r.regNo || r.uid).trim());

    const duplicateNames = names.filter((n, i) => names.indexOf(n) !== i);
    const duplicateRegNos = regNos.filter((r, i) => regNos.indexOf(r) !== i);

    console.log(`Deep check for Dec 2025 Admissions:`);
    console.log(`Count: ${decAdmissions.length}`);
    console.log(`Duplicate Names:`, duplicateNames);
    console.log(`Duplicate RegNos:`, duplicateRegNos);

    if (duplicateNames.length > 0) {
        console.log(`\nDetails for Duplicate Names:`);
        duplicateNames.forEach(n => {
            const matches = decAdmissions.filter(r => (r['Candidate Name'] || r.candidateName) === n);
            console.log(`Name: ${n}`);
            matches.forEach(m => console.log(`  - RegNo: ${m['REG NO / APP NO'] || m.regNo} | AdmDate: ${m['Date of Admission'] || m.date}`));
        });
    }

    admin.app().delete();
}

check();
