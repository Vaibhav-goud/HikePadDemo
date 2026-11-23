const { MongoClient } = require('mongodb');
const { normalizeName } = require('../utils/normalization');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGO_URI;
const dbName = 'hike_dashboard_db';

async function backfill() {
    const client = new MongoClient(mongoUri);
    try {
        await client.connect();
        const db = client.db(dbName);
        console.log('connected to MongoDB');

        const collections = ['users', 'sales_records', 'KRA_Reports_HYD', 'KRA_Reports_MUM'];

        for (const colName of collections) {
            console.log(`Backfilling ${colName}...`);
            const collection = db.collection(colName);
            const cursor = collection.find({});

            let count = 0;
            const operations = [];

            while (await cursor.hasNext()) {
                const doc = await cursor.next();
                const update = { $set: {} };

                // For users and KRA
                if (doc.name) {
                    update.$set.normalizedName = normalizeName(doc.name);
                }

                // For KRA/Sales (Team Leader)
                if (doc.teamLeader) {
                    update.$set.teamLeadNameNormalized = normalizeName(doc.teamLeader);
                }

                // For KRA/Sales (BDE Name - sometimes different field)
                if (doc.bdeName) {
                    update.$set.bdeNameNormalized = normalizeName(doc.bdeName);
                }

                if (Object.keys(update.$set).length > 0) {
                    operations.push({
                        updateOne: {
                            filter: { _id: doc._id },
                            update: update
                        }
                    });
                }

                count++;
                if (operations.length >= 500) {
                    await collection.bulkWrite(operations);
                    operations.length = 0;
                    console.log(`Updated ${count} records in ${colName}...`);
                }
            }

            if (operations.length > 0) {
                await collection.bulkWrite(operations);
            }
            console.log(`Finished ${colName}. Total: ${count}`);
        }

        console.log('Backfill completed successfully.');
    } catch (error) {
        console.error('Backfill failed:', error);
    } finally {
        await client.close();
    }
}

backfill();
