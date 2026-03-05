const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async (retries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Check if MongoDB URI is provided
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/financial_analyzer';
      if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      const conn = await mongoose.connect(uri, {
        // Removed deprecated options for MongoDB Driver 4.0+
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4 // Use IPv4, skip trying IPv6
      });

      logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
      logger.info(`📁 Database: ${conn.connection.name}`);
      
      // List existing collections for debugging
      const collections = await conn.connection.db.listCollections().toArray();
      logger.info(`📊 Collections found: ${collections.map(c => c.name).join(', ')}`);
      return; // success — exit the retry loop
      
    } catch (error) {
      logger.error(`MongoDB connection attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt < retries) {
        logger.info(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // SECURITY: Never log the full URI — it may contain credentials
        const safeUri = (process.env.MONGODB_URI || '').replace(/\/\/([^:]+):([^@]+)@/, '//<credentials>@');
        logger.error('MongoDB URI (sanitized):', safeUri);
        logger.error('Make sure MongoDB is running and the connection string is correct');
        process.exit(1);
      }
    }
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected — attempting reconnection...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err.message);
});

module.exports = connectDB;
