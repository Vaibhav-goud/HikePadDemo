require('dotenv').config();
const { connectToDB, getDB } = require('./mongo');

async function clear() {
    await connectToDB();
    const db = getDB();
    await db.collection('KRA_Reports').deleteMany({});
    console.log('Cleared KRA_Reports collection.');
    process.exit(0);
}

clear();
