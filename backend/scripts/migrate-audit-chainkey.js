/**
 * Migration: chain audit events on a general scope key.
 *
 * EstateAuditEvent originally required estateCaseId and enforced uniqueness on
 * (estateCaseId, sequence). That prevented auditing anything without an estate
 * case - nominee edits happen years before anyone dies - and once estateCaseId
 * became optional, every such event collided at sequence 1 with estateCaseId
 * null.
 *
 * This backfills chainKey on existing rows and replaces the stale unique index
 * with (chainKey, sequence). Safe to run repeatedly.
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000, maxPoolSize: 5 });
  const col = mongoose.connection.db.collection('estateauditevents');

  const before = await col.indexes();
  console.log('Indexes before:');
  before.forEach((i) => console.log(`   ${i.name}${i.unique ? '  UNIQUE' : ''}`));

  // Backfill chainKey: estateCaseId, else dormancyCaseId, else userId.
  const backfill = await col.updateMany(
    { chainKey: { $exists: false } },
    [
      {
        $set: {
          chainKey: {
            $toString: {
              $ifNull: ['$estateCaseId', { $ifNull: ['$dormancyCaseId', '$userId'] }]
            }
          }
        }
      }
    ]
  );
  console.log(`\nBackfilled chainKey on ${backfill.modifiedCount} existing row(s)`);

  // Remove any rows that still have no scope at all - they cannot be chained
  // and should never have been written.
  const orphans = await col.deleteMany({ $or: [{ chainKey: null }, { chainKey: '' }] });
  if (orphans.deletedCount) {
    console.log(`Removed ${orphans.deletedCount} unscoped audit row(s)`);
  }

  try {
    await col.dropIndex('estateCaseId_1_sequence_1');
    console.log('Dropped stale index estateCaseId_1_sequence_1');
  } catch (error) {
    console.log(`Drop skipped: ${error.codeName || error.message}`);
  }

  const EstateAuditEvent = require('../models/EstateAuditEvent');
  await EstateAuditEvent.syncIndexes();

  const after = await col.indexes();
  console.log('\nIndexes after:');
  after.forEach((i) => console.log(`   ${i.name}${i.unique ? '  UNIQUE' : ''}`));

  await mongoose.disconnect();
  console.log('\nMigration complete.');
}

run().catch(async (error) => {
  console.error('Migration failed:', error.message);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
