require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Simple Database Index Creation Script
 * Creates optimal indexes without loading all services
 */

async function createIndexes() {
  try {
    console.log('🚀 Creating database indexes...\n');
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/financial_analyzer';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Transaction indexes
    console.log('📝 Creating Transaction indexes...');
    const transactions = db.collection('transactions');
    await transactions.createIndex({ userId: 1, date: -1 });
    await transactions.createIndex({ userId: 1, category: 1, date: -1 });
    await transactions.createIndex({ userId: 1, type: 1, date: -1 });
    await transactions.createIndex({ userId: 1, amount: -1 });
    await transactions.createIndex({ userId: 1, isRecurring: 1 });
    await transactions.createIndex({ userId: 1, 'creditCard.cardNumber': 1 });
    await transactions.createIndex({ date: -1 });
    console.log('  ✅ Done (7 indexes)');

    // User indexes
    console.log('📝 Creating User indexes...');
    const users = db.collection('users');
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ phone: 1 }, { sparse: true });
    await users.createIndex({ isActive: 1 });
    await users.createIndex({ role: 1 });
    console.log('  ✅ Done (4 indexes)');

    // Document indexes
    console.log('📝 Creating Document indexes...');
    const documents = db.collection('documents');
    await documents.createIndex({ userId: 1, uploadDate: -1 });
    await documents.createIndex({ userId: 1, status: 1 });
    await documents.createIndex({ userId: 1, type: 1 });
    console.log('  ✅ Done (3 indexes)');

    // EMI indexes
    console.log('📝 Creating EMI indexes...');
    const emis = db.collection('emis');
    await emis.createIndex({ userId: 1, status: 1 });
    await emis.createIndex({ userId: 1, nextPaymentDate: 1 });
    await emis.createIndex({ userId: 1, startDate: -1 });
    await emis.createIndex({ nextPaymentDate: 1, status: 1 });
    console.log('  ✅ Done (4 indexes)');

    // BillReminder indexes
    console.log('📝 Creating BillReminder indexes...');
    const billreminders = db.collection('billreminders');
    await billreminders.createIndex({ userId: 1, dueDate: 1 });
    await billreminders.createIndex({ userId: 1, isPaid: 1 });
    await billreminders.createIndex({ dueDate: 1, isPaid: 1 });
    await billreminders.createIndex({ userId: 1, isRecurring: 1 });
    console.log('  ✅ Done (4 indexes)');

    // Budget indexes
    console.log('📝 Creating Budget indexes...');
    const budgets = db.collection('budgets');
    await budgets.createIndex({ userId: 1, month: -1, year: -1 });
    await budgets.createIndex({ userId: 1, category: 1 });
    await budgets.createIndex({ userId: 1, isActive: 1 });
    console.log('  ✅ Done (3 indexes)');

    // Notification indexes
    console.log('📝 Creating Notification indexes...');
    const notifications = db.collection('notifications');
    await notifications.createIndex({ userId: 1, createdAt: -1 });
    await notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
    await notifications.createIndex({ userId: 1, type: 1 });
    await notifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('  ✅ Done (4 indexes)');

    // ActivityLog indexes
    console.log('📝 Creating ActivityLog indexes...');
    const activitylogs = db.collection('activitylogs');
    await activitylogs.createIndex({ userId: 1, timestamp: -1 });
    await activitylogs.createIndex({ userId: 1, action: 1 });
    await activitylogs.createIndex({ timestamp: -1 });
    await activitylogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL
    console.log('  ✅ Done (4 indexes)');

    // FinancialProfile indexes
    console.log('📝 Creating FinancialProfile indexes...');
    const financialprofiles = db.collection('financialprofiles');
    await financialprofiles.createIndex({ userId: 1 }, { unique: true });
    await financialprofiles.createIndex({ 'cibilScore.score': -1 });
    await financialprofiles.createIndex({ 'cibilScore.lastUpdated': -1 });
    console.log('  ✅ Done (3 indexes)');

    // Get statistics
    console.log('\n📊 Collection Statistics:\n');
    const collections = [
      'transactions', 'users', 'documents', 'emis', 
      'billreminders', 'budgets', 'notifications', 
      'activitylogs', 'financialprofiles'
    ];

    let totalDocs = 0;
    let totalIndexes = 0;

    for (const collName of collections) {
      try {
        const coll = db.collection(collName);
        const count = await coll.countDocuments();
        const indexes = await coll.indexes();
        
        console.log(`  ${collName}:`);
        console.log(`    Documents: ${count.toLocaleString()}`);
        console.log(`    Indexes: ${indexes.length}`);
        
        totalDocs += count;
        totalIndexes += indexes.length;
      } catch (err) {
        console.log(`  ${collName}: Collection not found or empty`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Optimization Complete!`);
    console.log(`   Total Documents: ${totalDocs.toLocaleString()}`);
    console.log(`   Total Indexes: ${totalIndexes}`);
    console.log('='.repeat(60));

    console.log('\n💡 Performance Tips:');
    console.log('  • Indexes speed up queries but slow down writes');
    console.log('  • Monitor index usage with db.collection.stats()');
    console.log('  • Remove unused indexes periodically');
    console.log('  • Use compound indexes for multi-field queries');
    console.log('  • Enable MongoDB profiling to find slow queries\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
    process.exit(0);
  }
}

createIndexes();
