/**
 * Script to list all users in the database
 * Usage: node list-users.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function listUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial_analyzer');
    console.log('✅ Connected to MongoDB\n');

    // Find all users
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    if (users.length === 0) {
      console.log('No users found in the database.');
      process.exit(0);
    }

    console.log(`Found ${users.length} user(s):\n`);
    console.log('='.repeat(100));

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   Joined: ${user.createdAt.toLocaleDateString()}`);
      console.log(`   Last Login: ${user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'}`);
      console.log('-'.repeat(100));
    });

    console.log(`\nTotal Users: ${users.length}`);
    console.log(`Active Users: ${users.filter(u => u.isActive).length}`);
    console.log(`Admins: ${users.filter(u => u.role === 'admin').length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listUsers();
