const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!uri) {
    console.error('ERROR: MONGO_URI is not defined in .env');
    process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const users = db.collection('users');
        const sales = db.collection('sales_records');

        const searchName = "Bayana Rakesh";
        console.log(`\n--- DEBUGGING STATUS FOR: ${searchName} ---\n`);

        // Check in Users collection
        console.log('1. Checking Users Collection:');
        const userRecords = await users.find({
            $or: [
                { name: { $regex: new RegExp(searchName, 'i') } },
                { username: { $regex: new RegExp(searchName, 'i') } }
            ]
        }).toArray();

        if (userRecords.length > 0) {
            userRecords.forEach(u => {
                console.log(`   - Found user record: "${u.name}" (Username: ${u.username})`);
                console.log(`     Inactive status: ${u.inactive}`);
                console.log(`     Role: ${u.role}`);
                console.log(`     Branch: ${u.branch}`);
            });
        } else {
            console.log('   - No user record found in "users" collection.');
        }

        // Check in Sales Records
        console.log('\n2. Checking Sales Records (Latest 5):');
        const salesRecs = await sales.find({
            bdeName: { $regex: new RegExp(searchName, 'i') }
        }).sort({ uploadedAt: -1 }).limit(5).toArray();

        if (salesRecs.length > 0) {
            salesRecs.forEach(r => {
                console.log(`   - Found sales record - BDE: "${r.bdeName}", Month: ${r.month}, FY: ${r.fy}, Branch: ${r.branch}`);
                console.log(`     Inactive: ${r.inactive}, isCurrentTeamMember: ${r.isCurrentTeamMember}`);
            });
        } else {
            console.log('   - No sales records found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}
run();
