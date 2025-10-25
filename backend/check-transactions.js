const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/financial_analyzer').then(async () => {
  const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));
  
  const count = await Transaction.countDocuments({ userId: '68fb581cab185e0313081680' });
  console.log('Total transactions for user:', count);
  
  const byDoc = await Transaction.aggregate([
    { $match: { userId: '68fb581cab185e0313081680' } },
    { $group: { _id: '$documentId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  console.log('\nTransactions by document:');
  byDoc.forEach(doc => {
    console.log(`  Document ${doc._id}: ${doc.count} transactions`);
  });
  
  await mongoose.disconnect();
});
