const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const db = client.db('hike_dashboard_db');
        const users = db.collection('users');
        const sales = db.collection('sales_records');

        // Sync ALL users inactive status to sales records
        console.log('Starting global inactive status sync...');

        const allUsers = await users.find({}).toArray();
        let updatedCount = 0;

        for (const user of allUsers) {
            if (user.inactive !== undefined) {
                const result = await sales.updateMany(
                    { bdeName: user.name, branch: user.branch },
                    { $set: { inactive: user.inactive } }
                );
                if (result.modifiedCount > 0) {
                    console.log(`Synced "${user.name}" (${user.branch}) -> inactive: ${user.inactive} (${result.modifiedCount} records)`);
                    updatedCount += result.modifiedCount;
                }
            }
        }

        console.log(`Global sync complete. Total sales records updated: ${updatedCount}`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}
run();
