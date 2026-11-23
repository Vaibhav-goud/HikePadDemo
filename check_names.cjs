
require('dotenv').config({ path: './backend/.env' });
const { connectToDB, getDB } = require('./backend/mongo');
const { normalizeName } = require('./backend/utils/normalization');

async function checkNames() {
    try {
        await connectToDB();
        const db = getDB();
        const collections = ['HYD-ADM', 'MUM-ADM', 'KRA_Reports_HYD', 'KRA_Reports_MUM'];

        const allNames = new Set();

        for (const col of collections) {
            const list = await db.listCollections({ name: col }).toArray();
            if (list.length === 0) continue;

            const names = await db.collection(col).distinct('bdeName');
            names.forEach(n => { if (n) allNames.add(n); });

            const names2 = await db.collection(col).distinct('name');
            names2.forEach(n => { if (n) allNames.add(n); });
        }

        const sortedNames = Array.from(allNames).sort();
        console.log('--- Unique Names Found ---');
        sortedNames.forEach(name => {
            const norm = normalizeName(name);
            const firstName = norm.split(' ')[0];
            console.log(`Original: "${name}" | Norm: "${norm}" | First: "${firstName}"`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkNames();
