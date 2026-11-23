/**
 * Migration script to fix Shubham Kashyap's role
 * This script ensures Shubham Kashyap from Hyderabad Branch is always treated as BDE
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'hikepad';
const USERS_COLLECTION = 'users';

async function fixShubhamKashyapRole() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(DB_NAME);
        const usersCollection = db.collection(USERS_COLLECTION);
        const salesCollection = db.collection('salesRecords');

        // The exact name with trailing space
        const exactName = 'Shubham Kashyap ';

        console.log(`\nSearching for: "${exactName}" (length: ${exactName.length})`);

        // Find and update Shubham Kashyap in Hyderabad Branch (exact match)
        const result = await usersCollection.updateOne(
            {
                name: exactName,
                branch: 'Hyderabad Branch'
            },
            {
                $set: {
                    role: 'Business Development Executive'
                }
            }
        );

        if (result.matchedCount > 0) {
            console.log(`✓ Updated "${exactName}" role to Business Development Executive`);
            console.log(`  Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        } else {
            console.log(`ℹ "${exactName}" not found in Hyderabad Branch (exact match)`);

            // Try fuzzy match
            const fuzzyResult = await usersCollection.updateMany(
                {
                    name: { $regex: /^\s*shubham\s+kashyap\s*$/i },
                    branch: 'Hyderabad Branch'
                },
                {
                    $set: {
                        role: 'Business Development Executive'
                    }
                }
            );

            if (fuzzyResult.matchedCount > 0) {
                console.log(`✓ Updated via fuzzy match: ${fuzzyResult.matchedCount} users`);
            }
        }

        // Verify the update
        const user = await usersCollection.findOne({
            name: exactName,
            branch: 'Hyderabad Branch'
        });

        if (user) {
            console.log('\n✓ Current user record:');
            console.log(`  Name: "${user.name}" (length: ${user.name.length})`);
            console.log(`  Branch: ${user.branch}`);
            console.log(`  Role: ${user.role}`);
            console.log(`  Inactive: ${user.inactive || false}`);
        } else {
            console.log('\nℹ User not found after update attempt');
        }

        // Also check if he appears as team leader in sales records
        const asTeamLeader = await salesCollection.countDocuments({
            teamLeader: exactName,
            branch: 'Hyderabad Branch'
        });

        if (asTeamLeader > 0) {
            console.log(`\n⚠ Warning: "${exactName}" appears as Team Leader in ${asTeamLeader} sales records`);
            console.log('  This is expected if he was a team leader in the uploaded data.');
            console.log('  The system will treat him as BDE only despite this.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

// Run the migration
fixShubhamKashyapRole();
