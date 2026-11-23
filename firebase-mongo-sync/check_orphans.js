import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const serviceAccountPath = path.join(__dirname, '..', 'ServiceAccountMaster.json');

async function checkOrphanRecords() {
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

    let recordWithDateButNoName = 0;

    const traverse = (node, pathStr) => {
        if (!node || typeof node !== 'object') return;

        // If it's a leaf node with values but doesn't look like a record
        const keys = Object.keys(node);
        const hasDate = keys.some(k => k.toLowerCase().includes('date'));
        const hasRegNo = node['REG NO_ APP NO'] || node['REG NO / APP NO'] || node['regNo'];
        const hasName = node['Candidate Name'];

        if (hasDate && !hasRegNo && !hasName) {
            console.log(`Possible Orphan Node at ${pathStr}:`, JSON.stringify(node));
            recordWithDateButNoName++;
        }

        keys.forEach(k => traverse(node[k], pathStr + '/' + k));
    };
    traverse(dataVal, 'MUM-DERs');

    process.exit(0);
}

checkOrphanRecords();
