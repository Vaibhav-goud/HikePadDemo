const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hike-pad';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('hike-pad');
    
    console.log("Checking user 'shubham kashyap' (case-insensitive)...");
    const users = await db.collection('users').find({ name: /shubham kashyap/i }).toArray();
    console.log("Users found in DB:");
    users.forEach(u => console.log(`- Name: "${u.name}", Inactive: ${u.inactive}, Branch: ${u.branch}, Role: ${u.role}`));
    
    console.log("\nChecking sales records where teamLeader is 'shubham kashyap'...");
    const records = await db.collection('salesrecords').find({ teamLeader: /shubham kashyap/i }).limit(5).toArray();
    console.log(`Found ${records.length} sample records.`);
    if (records.length > 0) {
      console.log(`Sample record branch: ${records[0].branch}, Month: ${records[0].month}, DB Name: ${records[0].teamLeader}`);
    }

  } finally {
    await client.close();
  }
}

main().catch(console.error);
