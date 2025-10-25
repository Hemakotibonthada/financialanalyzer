const dotenv = require('dotenv');
dotenv.config();

console.log('Environment variables check:');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB Connected:', conn.connection.host);
    console.log('📁 Database:', conn.connection.name);
    
    // Test a simple operation
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('📊 Collections:', collections.map(c => c.name));
    
    await mongoose.disconnect();
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
  }
}

testConnection();