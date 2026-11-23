const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkOverall() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const salesCollection = db.collection('sales_records');

        const records = await salesCollection.find({ bdeName: 'Abhishek B' }).toArray();
        console.log(`Found ${records.length} total records for Abhishek B`);
        
        let totalTarget = 0;
        let totalPoints = 0;
        records.forEach(r => {
            totalTarget += Number(r.target) || 0;
            totalPoints += Number(r.closedPoints) || 0;
            console.log(`- ${r.month} (${r.fy}): Target ${r.target}, Points ${r.closedPoints}`);
        });

        const overallAch = totalTarget > 0 ? Math.round((totalPoints / totalTarget) * 100) : 0;
        console.log(`Overall Achievement: ${overallAch}%`);

        // Check overall leadership
        console.log('\n--- Overall Top 10 ---');
        const allRecords = await salesCollection.find({ inactive: { $ne: true } }).toArray();
        const bdeMap = new Map();
        allRecords.forEach(r => {
            const key = r.bdeName;
            if (!bdeMap.has(key)) bdeMap.set(key, { name: r.bdeName, target: 0, points: 0 });
            const bde = bdeMap.get(key);
            bde.target += Number(r.target) || 0;
            bde.points += Number(r.closedPoints) || 0;
        });

        const sorted = Array.from(bdeMap.values()).map(b => ({
            ...b,
            achievement: b.target > 0 ? Math.round((b.points / b.target) * 100) : 0
        })).sort((a, b) => b.achievement - a.achievement);

        sorted.slice(0, 10).forEach((a, i) => {
            console.log(`${i+1}. ${a.name}: ${a.achievement}%`);
        });

        const rank = sorted.findIndex(a => a.name === 'Abhishek B') + 1;
        console.log(`Abhishek B Overall Rank: ${rank}`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkOverall();
