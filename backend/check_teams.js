const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGODB_URI;

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('hike_dashboard_db');
    
    console.log("Fetching distinct team leaders and team names from salesrecords...");
    const teamLeaders = await db.collection('salesrecords').distinct('teamLeader');
    const teamNames = await db.collection('salesrecords').distinct('teamName');
    
    console.log("\nDistinct Team Leaders:");
    console.log(teamLeaders.sort());
    
    console.log("\nDistinct Team Names:");
    console.log(teamNames.sort());

  } finally {
    await client.close();
  }
}

main().catch(console.error);
