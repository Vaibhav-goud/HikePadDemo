const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkMonthlyRanks() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const salesCollection = db.collection('sales_records');

        const months = ['FEBRUARY', 'MARCH'];
        for (const month of months) {
            console.log(`--- Global Top 5 for ${month} ---`);
            const records = await salesCollection.find({ month, inactive: { $ne: true } }).toArray();
            
            const bdeMap = new Map();
            records.forEach(r => {
                const key = r.bdeName;
                if (!bdeMap.has(key)) bdeMap.set(key, { name: r.bdeName, target: 0, points: 0 });
                const bde = bdeMap.get(key);
                bde.target += Number(r.target) || 0;
                bde.points += Number(r.closedPoints) || 0;
            });

            const achievers = Array.from(bdeMap.values()).map(b => ({
                ...b,
                achievement: b.target > 0 ? Math.round((b.points / b.target) * 100) : 0
            })).sort((a, b) => b.achievement - a.achievement);

            achievers.slice(0, 5).forEach((a, i) => {
                console.log(`${i+1}. ${a.name}: ${a.achievement}%`);
            });

            const abhishekb = achievers.find(a => a.name.toLowerCase().includes('abhishek b'));
            if (abhishekb) {
                console.log(`Abhishek B Rank in ${month}: ${achievers.indexOf(abhishekb) + 1} (${abhishekb.achievement}%)`);
            } else {
                console.log(`Abhishek B has NO records in ${month}`);
            }
            console.log('');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkMonthlyRanks();
