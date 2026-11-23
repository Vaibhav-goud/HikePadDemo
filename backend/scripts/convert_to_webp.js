require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const sharp = require('sharp');
const path = require('path');

// Ensure we are in the backend directory to load .env
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
const DB_NAME = 'hike_dashboard_db';
const USER_IMAGES_COLLECTION = 'user-images';
const IMAGES_COLLECTION = 'images';

async function convertImages() {
    if (!uri) {
        console.error('MONGO_URI or MONGODB_URI not found in environment variables');
        process.exit(1);
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        console.log('Connected to MongoDB');

        for (const collectionName of [USER_IMAGES_COLLECTION, IMAGES_COLLECTION]) {
            console.log(`\nProcessing collection: ${collectionName}`);
            const collection = db.collection(collectionName);
            const images = await collection.find({}).toArray();
            console.log(`Found ${images.length} images in ${collectionName}`);

            let convertedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            let totalSavedBytes = 0;

            for (const img of images) {
                if (!img.imageUrl) {
                    skippedCount++;
                    continue;
                }

                // Check if already WebP
                if (img.imageUrl.startsWith('data:image/webp')) {
                    skippedCount++;
                    continue;
                }

                try {
                    const parts = img.imageUrl.split(',');
                    if (parts.length !== 2) {
                        console.warn(`[${img.name || img._id}] Invalid image format, skipping`);
                        errorCount++;
                        continue;
                    }

                    const buffer = Buffer.from(parts[1], 'base64');
                    const originalSize = buffer.length;

                    const webpBuffer = await sharp(buffer)
                        .webp({ quality: 80 })
                        .toBuffer();

                    const newImageUrl = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
                    const savedBytes = originalSize - webpBuffer.length;
                    const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);
                    totalSavedBytes += savedBytes;

                    await collection.updateOne(
                        { _id: img._id },
                        { $set: { imageUrl: newImageUrl, updatedAt: new Date() } }
                    );

                    console.log(`[${img.name || img._id}] Converted: ${(originalSize / 1024).toFixed(1)} KB -> ${(webpBuffer.length / 1024).toFixed(1)} KB (Saved: ${savedPercent}%)`);
                    convertedCount++;
                } catch (err) {
                    console.error(`[${img.name || img._id}] Error converting:`, err.message);
                    errorCount++;
                }
            }
            console.log(`Finished ${collectionName}: Converted ${convertedCount}, Skipped ${skippedCount}, Errors ${errorCount}`);
            console.log(`Total space saved in ${collectionName}: ${(totalSavedBytes / (1024 * 1024)).toFixed(2)} MB`);
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await client.close();
    }
}

convertImages();
