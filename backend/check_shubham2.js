const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hike-pad';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('hike-pad');
    
    console.log("Checking all users with 'shubham' in their name...");
    const users = await db.collection('users').find({ name: /shubham/i }).toArray();
    users.forEach(u => console.log(`- Name: "${u.name}", Inactive: ${u.inactive}, Branch: ${u.branch}, Role: ${u.role}`));
    
    console.log("\nChecking all users from Hyderabad...");
    const hydUsers = await db.collection('users').find({ branch: /hyderabad/i }).toArray();
    const hydLeaders = hydUsers.filter(u => ['Team Leader', 'Proposed Team Leader (PTL)', 'Assistant Team Leader (ATL)'].includes(u.role));
    console.log(`Found ${hydLeaders.length} team leaders in Hyderabad:`);
    hydLeaders.forEach(u => console.log(`- Name: "${u.name}", Inactive: ${u.inactive}, Role: ${u.role}`));
  } finally {
    await client.close();
  }
}

main().catch(console.error);
