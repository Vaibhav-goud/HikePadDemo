require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
const DB_NAME = 'hike_dashboard_db';
const USER_IMAGES_COLLECTION = 'user-images';
const IMAGES_COLLECTION = 'images';

async function verify() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        
        for (const collName of [USER_IMAGES_COLLECTION, IMAGES_COLLECTION]) {
            const collection = db.collection(collName);
            const webpCount = await collection.countDocuments({ imageUrl: { $regex: /^data:image\/webp/ } });
            const nonWebpCount = await collection.countDocuments({ imageUrl: { $not: /^data:image\/webp/ } });
            const totalCount = await collection.countDocuments({});
            
            console.log(`Collection: ${collName}`);
            console.log(`  Total: ${totalCount}`);
            console.log(`  WebP: ${webpCount}`);
            console.log(`  Non-WebP: ${nonWebpCount}`);
        }
    } finally {
        await client.close();
    }
}

verify();
