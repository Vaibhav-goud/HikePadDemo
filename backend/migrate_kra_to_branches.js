require('dotenv').config();
const { connectToDB, getDB } = require('./mongo');

async function migrateKRACollections() {
    console.log('Starting KRA collection migration to branch-specific collections...\n');

    try {
        await connectToDB();
        const db = getDB();

        // Step 1: Check if old collection exists and get data
        const oldCollection = db.collection('KRA_Reports');
        const existingData = await oldCollection.find({}).toArray();
        console.log(`Found ${existingData.length} records in old KRA_Reports collection`);

        // Step 2: Create new branch-specific collections
        const hydCollection = db.collection('KRA_Reports_HYD');
        const mumCollection = db.collection('KRA_Reports_MUM');

        // Step 3: Migrate existing data if any
        // Note: Since Firebase has logs_HYD and logs_MUM, the sync service will populate these
        // For now, we'll just create the collections
        console.log('\nCreating new branch-specific collections:');
        console.log('- KRA_Reports_HYD');
        console.log('- KRA_Reports_MUM');

        // Ensure collections exist by inserting a dummy document and removing it
        await hydCollection.insertOne({ _temp: true });
        await hydCollection.deleteOne({ _temp: true });

        await mumCollection.insertOne({ _temp: true });
        await mumCollection.deleteOne({ _temp: true });

        console.log('✓ New collections created successfully');

        // Step 4: Delete old collection
        console.log('\nDeleting old KRA_Reports collection...');
        await oldCollection.drop();
        console.log('✓ Old collection deleted successfully');

        console.log('\n✅ Migration completed successfully!');
        console.log('\nNext steps:');
        console.log('1. The Firebase sync service will populate the new collections');
        console.log('2. Backend API has been updated to query branch-specific collections');
        console.log('3. Frontend will filter based on user access level');

    } catch (error) {
        if (error.message.includes('ns not found')) {
            console.log('Old KRA_Reports collection does not exist, creating new collections only...');
            const db = getDB();
            const hydCollection = db.collection('KRA_Reports_HYD');
            const mumCollection = db.collection('KRA_Reports_MUM');

            await hydCollection.insertOne({ _temp: true });
            await hydCollection.deleteOne({ _temp: true });

            await mumCollection.insertOne({ _temp: true });
            await mumCollection.deleteOne({ _temp: true });

            console.log('✓ New collections created successfully');
        } else {
            console.error('Migration failed:', error);
            throw error;
        }
    } finally {
        process.exit(0);
    }
}

migrateKRACollections();
