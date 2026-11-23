import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = process.env.MONGO_URI;

async function test() {
    console.log('Testing connection to:', mongoUri.replace(/:([^@]+)@/, ':****@'));
    const client = new MongoClient(mongoUri);
    try {
        await client.connect();
        console.log('Successfully connected!');
        await client.close();
    } catch (e) {
        console.error('Connection failed:', e);
    }
}

test();
