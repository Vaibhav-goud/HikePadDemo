import { MongoClient } from 'mongodb';
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

async function findTheOne() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('MONGO_URI not found in .env');
        process.exit(1);
    }

    // 1. Get Feb Admissions from MongoDB
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db('hike_dashboard_db');
    const mongoFeb = await db.collection('MUM-ADM').find({
        registrationType: 'Admissions',
        admissionDate: {
            $gte: new Date('2026-02-01T00:00:00Z'),
            $lte: new Date('2026-02-28T23:59:59Z')
        }
    }).toArray();
    const mongoRegs = new Set(mongoFeb.map(r => r.regNo));
    console.log(`MongoDB has ${mongoRegs.size} Feb Admissions.`);

    // 2. Get Feb Admissions from Firebase
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

    const firebaseFeb = allRecords.filter(r => {
        let type = (r['Registration_Admission'] || r['Registration/Admission'] || '').toLowerCase();
        if (!type.includes('admission')) return false;
        const dateStr = r['Date of Admission'] || r['Date of Registration'];
        const date = parseDate(dateStr);
        return date && date.getMonth() === 1 && date.getFullYear() === 2026;
    });
    console.log(`Firebase has ${firebaseFeb.length} Feb Admissions.`);

    // 3. Find missing
    for (const r of firebaseFeb) {
        const reg = r['REG NO_ APP NO'] || r['REG NO / APP NO'] || r.regNo;
        if (!mongoRegs.has(reg)) {
            console.log('\n--- MISSING RECORD FOUND ---');
            console.log(JSON.stringify(r, null, 2));

            // Check if it exists in Mongo at all but different date/type
            const m = await db.collection('MUM-ADM').findOne({ regNo: reg });
            if (m) {
                console.log('Record exists in Mongo but in a different state:');
                console.log(`- Type: ${m.registrationType}`);
                console.log(`- Date: ${m.admissionDate}`);
                console.log(`- Amount: ${m.amount}`);
                console.log(`- BDE: ${m.bdeName}`);
            } else {
                console.log('Record is totally missing from Mongo.');
            }
        }
    }

    await client.close();
    process.exit(0);
}

findTheOne().catch(err => {
    console.error(err);
    process.exit(1);
});
