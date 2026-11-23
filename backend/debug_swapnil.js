const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugSwapnil() {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/hikepad');
    try {
        await client.connect();
        const db = client.db();
        const usersCollection = db.collection('users');
        const salesCollection = db.collection('sales_records');

        const swapnil = await usersCollection.findOne({ name: { $regex: /^Swapnil$/i } });
        console.log('--- Swapnil Profile ---');
        console.log(JSON.stringify(swapnil, null, 2));

        if (swapnil) {
            console.log('\n--- Sample Sales Records for Swapnil Team ---');
            const records = await salesCollection.find({
                $or: [
                    { teamLeader: { $regex: /Swapnil/i } },
                    { teamName: { $regex: /Swapnil/i } }
                ]
            }).limit(5).toArray();

            records.forEach(r => {
                console.log(`BDE: ${r.bdeName} | Team: ${r.teamName} | TL: ${r.teamLeader} | ATL: ${r.atl}`);
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

debugSwapnil();
