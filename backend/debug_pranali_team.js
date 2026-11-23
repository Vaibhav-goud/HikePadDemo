const { MongoClient } = require('mongodb');
const MONGODB_URI = 'mongodb+srv://Vaibhav:Vaibhav123@database.z9kaebl.mongodb.net/hike_dashboard_db?retryWrites=true&w=majority&appName=Database';

async function check() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const names = ['Abbas', 'Harsh G', 'Yashpreet', 'Pranali D', 'Pranali'];
        const sales = await db.collection('sales_records').find({
            bdeName: { $in: names }
        }).toArray();

        console.log('--- Sales Records ---');
        sales.forEach(s => {
            console.log(`BDE: ${s.bdeName.padEnd(12)} | DBM: ${String(s.dbm).padEnd(15)} | TL: ${String(s.teamLeader).padEnd(12)} | isCurrent: ${s.isCurrentTeamMember}`);
        });

        console.log('\n--- Users ---');
        const users = await db.collection('users').find({
            name: { $in: names }
        }).toArray();
        users.forEach(u => {
            console.log(`User: ${u.name.padEnd(12)} | Role: ${u.role.padEnd(25)} | Branch: ${u.branch}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}
check();
