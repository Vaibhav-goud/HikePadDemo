const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkTopAchievers() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const salesCollection = db.collection('sales_records');

        console.log('--- Top 10 Achievers for MARCH (Mumbai Branch) ---');
        
        const marchRecords = await salesCollection.find({
            month: 'MARCH',
            branch: { $regex: /Mumbai/i }
        }).toArray();

        // Emulate getTopAchieversData logic
        const bdeMap = new Map();
        marchRecords.forEach(record => {
            const key = record.bdeName;
            const target = Number(record.target) || 0;
            const closedPoints = Number(record.closedPoints) || 0;

            if (!bdeMap.has(key)) {
                bdeMap.set(key, {
                    name: record.bdeName,
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

        achievers.slice(0, 10).forEach((a, i) => {
            console.log(`${i+1}. ${a.name}: ${a.achievement}% (Target: ${a.totalTarget}, Points: ${a.totalClosedPoints})`);
        });

        console.log('\n--- Searching for Abhishek B specifically ---');
        const abhishekb = achievers.find(a => a.name.toLowerCase().includes('abhishek b'));
        if (abhishekb) {
            const rank = achievers.indexOf(abhishekb) + 1;
            console.log(`Abhishek B Rank: ${rank}`);
        } else {
            console.log('Abhishek B not found in March achievers map.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkTopAchievers();
