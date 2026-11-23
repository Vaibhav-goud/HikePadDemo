
require('dotenv').config({ path: './backend/.env' });
const { connectToDB, getDB } = require('./backend/mongo');

async function check() {
    await connectToDB();
    const db = getDB();
    const bdes = await db.collection('MUM-ADM').find({
        bdeName: { $regex: /abhinav|yash|atharva|atharv|jash|shaheen/i }
    }).toArray();

    console.log("MUM-ADM samples:");
    const map = new Map();
    bdes.forEach(b => {
        const key = `${b.bdeName} -> ${b.bdeNameNormalized}`;
        map.set(key, (map.get(key) || 0) + 1);
    });

    for (const [key, count] of map.entries()) {
        console.log(`[${count} records] ${key}`);
    }
    process.exit(0);
}

check();
