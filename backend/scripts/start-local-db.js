/**
 * Local development MongoDB launcher.
 *
 * Starts an in-memory MongoDB instance (via mongodb-memory-server) bound to a
 * fixed port with a persistent data directory, so the rest of the app can keep
 * using the standard MONGODB_URI (mongodb://localhost:27017/financial_analyzer)
 * with no code changes. Useful for running the backend locally without
 * installing MongoDB system-wide.
 *
 * Usage:
 *   node scripts/start-local-db.js
 *
 * Keep this process running in its own terminal while the backend runs.
 */
const path = require('path');
const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const PORT = Number(process.env.LOCAL_DB_PORT || 27017);
const DB_NAME = process.env.LOCAL_DB_NAME || 'financial_analyzer';
const DATA_DIR = path.resolve(__dirname, '..', 'data', 'local-mongo');

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('Starting local MongoDB (mongodb-memory-server)...');
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: PORT,
      dbName: DB_NAME,
      dbPath: DATA_DIR,
      storageEngine: 'wiredTiger',
    },
  });

  const uri = mongod.getUri();
  console.log('✅ Local MongoDB is running.');
  console.log(`   URI: ${uri}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Data dir (persistent): ${DATA_DIR}`);
  console.log('Leave this terminal open. Press Ctrl+C to stop.');

  const shutdown = async () => {
    console.log('\nStopping local MongoDB...');
    try {
      await mongod.stop();
    } catch (err) {
      console.error('Error stopping MongoDB:', err.message);
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start local MongoDB:', err);
  process.exit(1);
});
