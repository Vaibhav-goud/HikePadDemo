const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkGlobalTopAchievers() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const salesCollection = db.collection('sales_records');

        console.log('--- Global Top 10 Achievers for MARCH (ALL Branches) ---');
        
        const marchRecords = await salesCollection.find({
            month: 'MARCH'
        }).toArray();

        const bdeMap = new Map();
        marchRecords.forEach(record => {
            if (record.inactive) return;
            const key = record.bdeName;
            const target = Number(record.target) || 0;
            const closedPoints = Number(record.closedPoints) || 0;

            if (!bdeMap.has(key)) {
                bdeMap.set(key, {
                    name: record.bdeName,
                    branch: record.branch,
                    totalTarget: 0,
                    totalClosedPoints: 0
                });
            }
            const bde = bdeMap.get(key);
            bde.totalTarget += target;
            bde.totalClosedPoints += closedPoints;
        });

        const achievers = Array.from(bdeMap.values()).map(bde => ({
            ...bde,
            achievement: bde.totalTarget > 0 ? Math.round((bde.totalClosedPoints / bde.totalTarget) * 100) : 0
        }));

        achievers.sort((a, b) => b.achievement - a.achievement);

        achievers.slice(0, 15).forEach((a, i) => {
            console.log(`${i+1}. ${a.name} (${a.branch}): ${a.achievement}%`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkGlobalTopAchievers();
