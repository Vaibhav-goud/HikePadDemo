
require('dotenv').config({ path: './backend/.env' });
const { connectToDB, getDB } = require('./backend/mongo');

async function findConflicts() {
    await connectToDB();
    const db = getDB();
    const users = await db.collection('users').find({}).toArray();

    // Group active users by their first name
    const groupedByFirstName = {};
    for (const u of users) {
        if (!u.name) continue;
        const norm = u.name.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9\s]/g, '');
        const parts = norm.split(' ');
        const firstName = parts.find(p => p.length > 1) || parts[0] || '';

        if (!groupedByFirstName[firstName]) {
            groupedByFirstName[firstName] = new Set();
        }
        groupedByFirstName[firstName].add(norm);
    }

    console.log("--- First names with multiple distinct full names ---");
    for (const [firstName, namesSet] of Object.entries(groupedByFirstName)) {
        const names = Array.from(namesSet);
        if (names.length > 1) {
            // Check if there are truly distinct initials?
            // "atharv" and "atharv g" -> one has no initial, one has 'g'.
            // "yash b" and "yash s" -> 'b' and 's', both distinct.
            // "pratik" and "pratik t" -> one has no initial, one has 't'.
            console.log(`[${firstName}] -> ${names.join(', ')}`);
        }
    }
    process.exit(0);
}

findConflicts();
