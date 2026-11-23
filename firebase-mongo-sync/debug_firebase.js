import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const serviceAccountPath = path.join(__dirname, '..', 'ServiceAccountMaster.json');

async function debug() {
    const data = await readFile(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(data);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    const ref = admin.database().ref('HYD-DERs');
    const snapshot = await ref.limitToFirst(5).once('value');
    console.log('HYD-DERs sample structure:');
    console.log(JSON.stringify(snapshot.val(), null, 2));
    process.exit(0);
}

debug();
