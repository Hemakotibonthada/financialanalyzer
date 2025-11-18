const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const User = require('./models/User');

async function generateToken() {
  try {
    // Get user email from command line or use default
    const email = process.argv[2] || 'admin@financialanalyzer.com';
    
    console.log(`\n🔍 Looking for user: ${email}`);
    
    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('\n📋 Available users:');
      const allUsers = await User.find({}).select('email name role');
      allUsers.forEach(u => console.log(`   - ${u.email} (${u.name}, ${u.role})`));
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user._id}`);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '2400h' }
    );
    
    console.log('\n🎟️  New JWT Token Generated:\n');
    console.log(token);
    console.log('\n📋 Copy and paste this in browser console:\n');
    console.log(`localStorage.setItem('token', '${token}');`);
    console.log(`localStorage.setItem('user', '${JSON.stringify({ _id: user._id, name: user.name, email: user.email, role: user.role })}');`);
    console.log(`location.reload();`);
    console.log('\n✅ Token valid for:', process.env.JWT_EXPIRE || '2400h');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

generateToken();
