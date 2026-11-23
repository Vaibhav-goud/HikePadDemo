
const { connectToDB, getDB } = require('./mongo');

async function deleteMumbaiData() {
    try {
        await connectToDB();
        const db = getDB();
        const collection = db.collection('sales_records');

        const branchName = 'Mumbai Branch';

        // 1. Count records before deletion
        const countBefore = await collection.countDocuments({ branch: branchName });
        console.log(`Found ${countBefore} records for branch: "${branchName}"`);

        if (countBefore === 0) {
            console.log('No records found for deletion.');
            process.exit(0);
        }

        // 2. Perform deletion
        console.log(`Deleting all sales records for branch: "${branchName}"...`);
        const result = await collection.deleteMany({ branch: branchName });

        console.log(`Successfully deleted ${result.deletedCount} records.`);

        // 3. Verify
        const countAfter = await collection.countDocuments({ branch: branchName });
        console.log(`Records remaining for "${branchName}": ${countAfter}`);

    } catch (error) {
        console.error('Error during deletion:', error);
    } finally {
        process.exit(0);
    }
}

deleteMumbaiData();
