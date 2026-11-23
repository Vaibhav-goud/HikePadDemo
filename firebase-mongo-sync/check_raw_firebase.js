import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
const serviceAccountPath = path.resolve(__dirname, '..', 'ServiceAccountMaster.json');

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

    const targets = ['248382', '248565'];

    const results = [];
    const processNode = (node) => {
        if (!node || typeof node !== 'object') return;
        const regNo = String(node['REG NO_ APP NO'] || node['REG NO / APP NO'] || node.regNo || node.uid).trim();
        if (targets.includes(regNo)) {
            results.push({
                regNo,
                name: node['Candidate Name'],
                admDate: node['Date of Admission'] || node.date,
                regDate: node['Date of Registration'],
                type: node['Registration_Admission'] || node['Registration/Admission'] || node.registrationType
            });
        }
        Object.values(node).forEach(child => processNode(child));
    };

    processNode(rootData);
    console.log(JSON.stringify(results, null, 2));

    admin.app().delete();
}

check();
