const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // Check if MongoDB URI is provided
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Removed deprecated options for MongoDB Driver 4.0+
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4, skip trying IPv6
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📁 Database: ${conn.connection.name}`);
    
    // List existing collections for debugging
    const collections = await conn.connection.db.listCollections().toArray();
    logger.info(`📊 Collections found: ${collections.map(c => c.name).join(', ')}`);
    
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error.message);
    logger.error('� Full error:', error);
    logger.error('🔧 MongoDB URI:', process.env.MONGODB_URI);
    logger.error('�💡 Make sure MongoDB is running and the connection string is correct');
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('✅ MongoDB reconnected');
});

module.exports = connectDB;
