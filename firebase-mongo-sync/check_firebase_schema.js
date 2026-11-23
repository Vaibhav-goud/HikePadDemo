import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const serviceAccountPath = path.join(__dirname, '..', 'ServiceAccountMaster.json');

async function checkFirebaseSchema() {
    const data = await readFile(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(data);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    const ref = admin.database().ref('MUM-DERs');
    const snapshot = await ref.limitToLast(10).once('value');
    const records = snapshot.val();

    console.log('Firebase Schema Check (MUM-DERs):');
    if (!records) {
        console.log('No records found.');
    } else {
        // Records might be nested. Flatten slightly to get samples.
        const samples = [];
        const traverse = (node) => {
            if (!node || typeof node !== 'object') return;
            if (node['REG NO / APP NO'] || node['REG NO/ APP NO'] || node['Candidate Name']) {
                samples.push(node);
                return;
            }
            Object.values(node).forEach(traverse);
        };
        traverse(records);

        if (samples.length > 0) {
            console.log('Sample record keys:', Object.keys(samples[0]));
            console.log('Sample record:', JSON.stringify(samples[0], null, 2));
        } else {
            // If nested deeply
            console.log('Keys at top level:', Object.keys(records));
        }
    }
    process.exit(0);
}

checkFirebaseSchema();
