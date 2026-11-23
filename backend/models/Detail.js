
const { getDB } = require('../mongo');

/**
 * Details Collection Schema (documented)
 * 
 * recordId (unique, indexed)
 * name (string)
 * date (Date)
 * target (number)
 * points (number)
 * admissions (number)
 * achievementPercentage (number)
 * status (string)
 * source (string, default: "firebase")
 * createdAt (Date)
 * updatedAt (Date)
 */

const COLLECTION_NAME = 'details';

/**
 * Ensures indexes for a given details collection.
 * Format: month_year_hyd (e.g., June_2025_hyd)
 */
async function ensureIndexes(customCollectionName, dbInstance) {
    const db = dbInstance || getDB();
    if (!db) return;

    const targetCollection = customCollectionName || COLLECTION_NAME;
    const collection = db.collection(targetCollection);

    // Create recordId unique index
    await collection.createIndex({ recordId: 1 }, { unique: true });

    // Create date index for filtering
    await collection.createIndex({ date: 1 });

    console.log(`Indexes ensured for collection: ${targetCollection}`);
}

/**
 * Formats "Month Year" (from Firebase) to "Month_Year_hyd" (for MongoDB)
 */
function formatCollectionName(monthYear) {
    if (!monthYear) return COLLECTION_NAME;
    return `${monthYear.replace(/\s+/g, '_')}_hyd`;
}

module.exports = {
    COLLECTION_NAME,
    ensureIndexes,
    formatCollectionName
};
