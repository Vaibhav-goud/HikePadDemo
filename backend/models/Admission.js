const { getDB } = require('../mongo');

/**
 * Admissions Collection Schema (documented)
 * 
 * registrationType (string) - Registration or Admission
 * regNo (string) - Unique identifier (REG NO / APP NO)
 * registrationDate (Date)
 * admissionDate (Date)
 * teamLeadName (string) - Original name
 * teamLeadNameNormalized (string) - Normalized name for joins
 * bdeName (string) - Original name
 * bdeNameNormalized (string) - Normalized name for joins
 * candidateName (string)
 * candidateNameNormalized (string)
 * universityName (string)
 * programName (string)
 * amount (number)
 * paymentMode (string)
 * feeType (string)
 * sourceOfAdmission (string)
 * points (number)
 * formStatus (string)
 * admissionStatus (string)
 * branch (string)
 * last_synced (Date)
 */

const ADMISSIONS_COLLECTION_HYD = 'HYD-ADM';
const ADMISSIONS_COLLECTION_MUM = 'MUM-ADM';

/**
 * Ensures indexes for the admissions collections.
 */
async function ensureAdmissionsIndexes(dbInstance) {
    const db = dbInstance || getDB();
    if (!db) return;

    const collections = [ADMISSIONS_COLLECTION_HYD, ADMISSIONS_COLLECTION_MUM];

    for (const colName of collections) {
        const collection = db.collection(colName);

        // Unique index on regNo/appNo to prevent duplicates during sync (upsert)
        await collection.createIndex({ regNo: 1 }, { unique: true });

        // Indexes for frequent query filters
        await collection.createIndex({ bdeNameNormalized: 1 });
        await collection.createIndex({ teamLeadNameNormalized: 1 });
        await collection.createIndex({ admissionDate: 1 });
        await collection.createIndex({ universityName: 1 });
        await collection.createIndex({ branch: 1 });
        await collection.createIndex({ admissionStatus: 1 });

        console.log(`Indexes ensured for collection: ${colName}`);
    }
}

module.exports = {
    ADMISSIONS_COLLECTION_HYD,
    ADMISSIONS_COLLECTION_MUM,
    ensureAdmissionsIndexes
};
