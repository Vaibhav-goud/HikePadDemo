import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const serviceAccountPath = path.join(__dirname, '..', 'ServiceAccountMaster.json');

async function debugAdmissions() {
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
    const missedNodes = [];

    const processNode = (node, path = '') => {
        if (!node || typeof node !== 'object') return;

        // Check if it's a potential record
        const hasRegNo1 = node['REG NO / APP NO'];
        const hasRegNo2 = node['REG NO_ APP NO'];
        const hasRegNo3 = node['regNo'];
        const hasCandidate = node['Candidate Name'] || node['candidateName'];

        if (hasRegNo1 || hasRegNo2 || hasRegNo3 || hasCandidate) {
            allRecords.push(node);

            // Debug: Why would this node be missed by the ORIGINAL logic?
            // Original logic: node['REG NO / APP NO'] || node['Candidate Name'] || node['regNo']
            if (!(node['REG NO / APP NO'] || node['Candidate Name'] || node['regNo'])) {
                missedNodes.push({ path, keys: Object.keys(node) });
            }
            return;
        }

        Object.entries(node).forEach(([key, child]) => processNode(child, `${path}/${key}`));
    };

    processNode(dataVal);

    console.log(`Total records matched by LOOSER logic: ${allRecords.length}`);
    console.log(`Nodes that would be MISSED by original logic: ${missedNodes.length}`);
    if (missedNodes.length > 0) {
        console.log('Sample missed node structure:', JSON.stringify(missedNodes[0], null, 2));
    }

    process.exit(0);
}

debugAdmissions();
