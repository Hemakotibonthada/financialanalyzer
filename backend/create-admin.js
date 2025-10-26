const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/financial_analyzer';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Define User Schema inline (to avoid circular dependencies)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['user', 'lender', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    console.log('\n========================================');
    console.log('Creating Admin User');
    console.log('========================================\n');

    const adminEmail = 'admin@circuvent.com';
    const adminPassword = 'Hemakoti@003';
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log(`Email: ${adminEmail}`);
      console.log(`Role: ${existingAdmin.role}`);
      
      // Update password if needed
      const isMatch = await bcrypt.compare(adminPassword, existingAdmin.password);
      if (!isMatch) {
        console.log('\n🔄 Updating admin password...');
        existingAdmin.password = await bcrypt.hash(adminPassword, 10);
        existingAdmin.role = 'admin';
        existingAdmin.isActive = true;
        await existingAdmin.save();
        console.log('✅ Admin password updated successfully!');
      } else {
        console.log('✅ Admin credentials are already correct.');
      }
    } else {
      console.log('Creating new admin user...');
      
      // Hash password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      // Create admin user
      const admin = new User({
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      
      await admin.save();
      console.log('✅ Admin user created successfully!');
    }
    
    console.log('\n========================================');
    console.log('Admin Credentials');
    console.log('========================================');
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role:     admin`);
    console.log('========================================\n');
    
    // Also create a test lender user
    const lenderEmail = 'lender@test.com';
    const lenderPassword = 'Lender@123';
    
    const existingLender = await User.findOne({ email: lenderEmail });
    
    if (!existingLender) {
      console.log('Creating test lender user...');
      const hashedLenderPassword = await bcrypt.hash(lenderPassword, 10);
      
      const lender = new User({
        name: 'Test Lender',
        email: lenderEmail,
        password: hashedLenderPassword,
        role: 'lender',
        isActive: true
      });
      
      await lender.save();
      console.log('✅ Test lender user created successfully!');
      console.log(`Email: ${lenderEmail}`);
      console.log(`Password: ${lenderPassword}`);
      console.log(`Role: lender\n`);
    }
    
    console.log('✅ Setup complete!\n');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error(error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

// Run the function
createAdminUser();
