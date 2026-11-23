require('dotenv').config();
const { connectToDB, getDB } = require('./mongo');

async function fixPranaliTeam() {
    try {
        await connectToDB();
        const db = getDB();

        const TARGET_TL_NAME = 'Pranali D';
        const TEAM_MEMBERS = ['Yashpreet', 'Abbas'];

        console.log('--- Unifying Pranali names in sales records ---');
        const unifyResult = await db.collection('sales_records').updateMany(
            { bdeName: 'Pranali' },
            { $set: { bdeName: TARGET_TL_NAME } }
        );
        console.log(`Updated ${unifyResult.modifiedCount} records from "Pranali" to "Pranali D".`);

        console.log('\n--- Updating Pranali D role to Team Leader ---');
        const roleResult = await db.collection('users').updateOne(
            { name: TARGET_TL_NAME },
            { $set: { role: 'Team Leader' } }
        );
        console.log(`Updated Pranali D role: ${roleResult.modifiedCount} user updated.`);

        console.log('\n--- Reassigning Team Members ---');
        for (const memberName of TEAM_MEMBERS) {
            const result = await db.collection('sales_records').updateMany(
                { bdeName: { $regex: new RegExp(`^${memberName}$`, 'i') } },
                {
                    $set: {
                        teamLeader: TARGET_TL_NAME,
                        teamName: `Team ${TARGET_TL_NAME}`
                    }
                }
            );
            console.log(`Reassigned ${memberName}: ${result.modifiedCount} records updated.`);
        }

        // Cleanup duplicate user if exists
        console.log('\n--- Cleaning up duplicate "Pranali" user ---');
        const deleteResult = await db.collection('users').deleteOne({ name: 'Pranali' });
        console.log(`Deleted duplicate user "Pranali": ${deleteResult.deletedCount}`);

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

fixPranaliTeam();
