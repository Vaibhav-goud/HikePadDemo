import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

async function check() {
    const data = await readFile(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(data);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    const db = admin.database();
    const rootRef = db.ref('/');

    const snapshot = await rootRef.once('value');
    const val = snapshot.val();

    if (!val) {
        console.log('Database is empty at root.');
    } else {
        console.log('Root keys:', Object.keys(val));
        if (val.reports) {
            console.log('Reports found! Count:', Object.keys(val.reports).length);
        } else if (val.daily_logs) {
            console.log('daily_logs found! Count:', Object.keys(val.daily_logs).length);
            const firstKey = Object.keys(val.daily_logs)[0];
            console.log('Sample data from daily_logs:', JSON.stringify(val.daily_logs[firstKey], null, 2));
        } else {
            console.log('Neither reports nor daily_logs found.');
        }
    }
    process.exit(0);
}

check();
