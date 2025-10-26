const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Document = require('../models/Document');
const EMI = require('../models/EMI');
const BillReminder = require('../models/BillReminder');
const Budget = require('../models/Budget');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../config/logger');

/**
 * Database Optimization Script
 * Analyzes and creates missing indexes for optimal query performance
 */

async function analyzeIndexes(Model, modelName) {
  try {
    console.log(`\n📊 Analyzing ${modelName}...`);
    
    // Get existing indexes
    const indexes = await Model.collection.getIndexes();
    console.log(`  Existing indexes: ${Object.keys(indexes).length}`);
    
    // Get collection stats
    const stats = await Model.collection.stats();
    console.log(`  Documents: ${stats.count}`);
    console.log(`  Storage size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Index size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      modelName,
      indexCount: Object.keys(indexes).length,
      documentCount: stats.count,
      storageSize: stats.storageSize,
      indexSize: stats.totalIndexSize
    };
  } catch (error) {
    console.error(`Error analyzing ${modelName}:`, error.message);
    return null;
  }
}

async function createOptimalIndexes() {
  try {
    console.log('🔧 Creating optimal indexes...\n');

    // Transaction indexes
    console.log('📝 Transaction indexes...');
    await Transaction.collection.createIndex({ userId: 1, date: -1 });
    await Transaction.collection.createIndex({ userId: 1, category: 1, date: -1 });
    await Transaction.collection.createIndex({ userId: 1, type: 1, date: -1 });
    await Transaction.collection.createIndex({ userId: 1, amount: -1 });
    await Transaction.collection.createIndex({ userId: 1, isRecurring: 1, recurringFrequency: 1 });
    await Transaction.collection.createIndex({ userId: 1, 'creditCard.cardNumber': 1 });
    await Transaction.collection.createIndex({ userId: 1, 'upi.transactionId': 1 });
    await Transaction.collection.createIndex({ date: -1 });
    await Transaction.collection.createIndex({ createdAt: -1 });
    console.log('  ✅ Transaction indexes created');

    // User indexes
    console.log('📝 User indexes...');
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ phone: 1 }, { sparse: true });
    await User.collection.createIndex({ isActive: 1 });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ createdAt: -1 });
    console.log('  ✅ User indexes created');

    // Document indexes
    console.log('📝 Document indexes...');
    await Document.collection.createIndex({ userId: 1, uploadDate: -1 });
    await Document.collection.createIndex({ userId: 1, status: 1 });
    await Document.collection.createIndex({ userId: 1, type: 1 });
    await Document.collection.createIndex({ status: 1, uploadDate: -1 });
    console.log('  ✅ Document indexes created');

    // EMI indexes
    console.log('📝 EMI indexes...');
    await EMI.collection.createIndex({ userId: 1, status: 1 });
    await EMI.collection.createIndex({ userId: 1, nextPaymentDate: 1 });
    await EMI.collection.createIndex({ userId: 1, startDate: -1 });
    await EMI.collection.createIndex({ userId: 1, loanType: 1 });
    await EMI.collection.createIndex({ nextPaymentDate: 1, status: 1 });
    console.log('  ✅ EMI indexes created');

    // BillReminder indexes
    console.log('📝 BillReminder indexes...');
    await BillReminder.collection.createIndex({ userId: 1, dueDate: 1 });
    await BillReminder.collection.createIndex({ userId: 1, isPaid: 1 });
    await BillReminder.collection.createIndex({ userId: 1, category: 1 });
    await BillReminder.collection.createIndex({ dueDate: 1, isPaid: 1 });
    await BillReminder.collection.createIndex({ userId: 1, isRecurring: 1 });
    console.log('  ✅ BillReminder indexes created');

    // Budget indexes
    console.log('📝 Budget indexes...');
    await Budget.collection.createIndex({ userId: 1, month: -1, year: -1 });
    await Budget.collection.createIndex({ userId: 1, category: 1, month: 1, year: 1 });
    await Budget.collection.createIndex({ userId: 1, isActive: 1 });
    console.log('  ✅ Budget indexes created');

    // Notification indexes
    console.log('📝 Notification indexes...');
    await Notification.collection.createIndex({ userId: 1, createdAt: -1 });
    await Notification.collection.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
    await Notification.collection.createIndex({ userId: 1, type: 1 });
    await Notification.collection.createIndex({ userId: 1, priority: 1, isRead: 1 });
    await Notification.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('  ✅ Notification indexes created');

    // ActivityLog indexes
    console.log('📝 ActivityLog indexes...');
    await ActivityLog.collection.createIndex({ userId: 1, timestamp: -1 });
    await ActivityLog.collection.createIndex({ userId: 1, action: 1, timestamp: -1 });
    await ActivityLog.collection.createIndex({ userId: 1, resourceType: 1, timestamp: -1 });
    await ActivityLog.collection.createIndex({ timestamp: -1 });
    await ActivityLog.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
    console.log('  ✅ ActivityLog indexes created');

    console.log('\n✅ All indexes created successfully!');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

async function analyzeSlowQueries() {
  try {
    console.log('\n🔍 Analyzing slow queries...\n');
    
    // Enable profiling (level 1 = slow queries only)
    await mongoose.connection.db.setProfilingLevel(1, { slowms: 100 });
    
    // Get slow query statistics
    const profileData = await mongoose.connection.db
      .collection('system.profile')
      .find({})
      .sort({ ts: -1 })
      .limit(10)
      .toArray();
    
    if (profileData.length === 0) {
      console.log('  No slow queries found (threshold: 100ms)');
    } else {
      console.log(`  Found ${profileData.length} slow queries:`);
      profileData.forEach((query, i) => {
        console.log(`\n  Query ${i + 1}:`);
        console.log(`    Duration: ${query.millis}ms`);
        console.log(`    Operation: ${query.op}`);
        console.log(`    Namespace: ${query.ns}`);
        if (query.command) {
          console.log(`    Command: ${JSON.stringify(query.command).substring(0, 100)}...`);
        }
      });
    }
  } catch (error) {
    console.log('  ℹ️  Profiling not available (requires admin privileges)');
  }
}

async function generateOptimizationReport() {
  try {
    console.log('📈 Generating optimization report...\n');
    
    const models = [
      { model: Transaction, name: 'Transaction' },
      { model: User, name: 'User' },
      { model: Document, name: 'Document' },
      { model: EMI, name: 'EMI' },
      { model: BillReminder, name: 'BillReminder' },
      { model: Budget, name: 'Budget' },
      { model: Notification, name: 'Notification' },
      { model: ActivityLog, name: 'ActivityLog' }
    ];

    const stats = [];
    for (const { model, name } of models) {
      const stat = await analyzeIndexes(model, name);
      if (stat) stats.push(stat);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 OPTIMIZATION SUMMARY');
    console.log('='.repeat(60));
    
    const totalDocs = stats.reduce((sum, s) => sum + s.documentCount, 0);
    const totalStorage = stats.reduce((sum, s) => sum + s.storageSize, 0);
    const totalIndexSize = stats.reduce((sum, s) => sum + s.indexSize, 0);
    const totalIndexes = stats.reduce((sum, s) => sum + s.indexCount, 0);
    
    console.log(`Total Documents: ${totalDocs.toLocaleString()}`);
    console.log(`Total Storage: ${(totalStorage / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total Index Size: ${(totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total Indexes: ${totalIndexes}`);
    console.log(`Index to Storage Ratio: ${((totalIndexSize / totalStorage) * 100).toFixed(2)}%`);
    console.log('='.repeat(60) + '\n');

    return stats;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

async function optimizeCollections() {
  try {
    console.log('\n🔧 Optimizing collections...\n');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      try {
        console.log(`  Compacting ${collection.name}...`);
        await mongoose.connection.db.command({ compact: collection.name });
        console.log(`    ✅ Compacted successfully`);
      } catch (error) {
        console.log(`    ⚠️  Compaction failed (may require admin privileges)`);
      }
    }
  } catch (error) {
    console.log('  ℹ️  Collection optimization requires admin privileges');
  }
}

async function main() {
  try {
    console.log('🚀 Starting Database Optimization...\n');
    console.log('='.repeat(60));
    
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/financial_analyzer';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Generate initial report
    console.log('📊 BEFORE OPTIMIZATION\n');
    await generateOptimizationReport();

    // Create optimal indexes
    await createOptimalIndexes();

    // Analyze slow queries
    await analyzeSlowQueries();

    // Optimize collections
    await optimizeCollections();

    // Generate final report
    console.log('\n📊 AFTER OPTIMIZATION\n');
    await generateOptimizationReport();

    console.log('✅ Database optimization completed successfully!\n');
    
    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    console.log('  1. Monitor query performance using MongoDB Atlas or Compass');
    console.log('  2. Review and remove unused indexes periodically');
    console.log('  3. Consider sharding for large collections (>100M documents)');
    console.log('  4. Enable MongoDB profiling in production (level 1)');
    console.log('  5. Set up alerts for slow queries (>100ms)');
    console.log('  6. Regular database maintenance (compact, reIndex)');
    console.log('  7. Archive old data (ActivityLogs, Notifications)');
    
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { analyzeIndexes, createOptimalIndexes, generateOptimizationReport };
