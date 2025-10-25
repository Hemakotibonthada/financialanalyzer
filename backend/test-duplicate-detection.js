const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5001';

// Using main user account
const TEST_USER = {
  email: 'hemakotibonthada@gmail.com',
  password: 'Hemakoti@003'  // UPDATE THIS!
};

async function testDuplicateDetection() {
  try {
    console.log('🔐 Step 1: Logging in...');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, TEST_USER);
    const token = loginRes.data.token;
    console.log('✅ Logged in successfully');

    // Use the unlocked ICICI statement
    const testFile = path.join(__dirname, 'uploads', 'financial', '1761394583855_Statement_OCT2025_060858597_unlocked.pdf');
    
    if (!fs.existsSync(testFile)) {
      console.log('⚠️  Test file not found. Please provide a PDF file path.');
      console.log('Expected location:', testFile);
      return;
    }

    console.log('\n📤 Step 2: Uploading document first time...');
    const formData1 = new FormData();
    formData1.append('documents', fs.createReadStream(testFile));
    
    const upload1 = await axios.post(`${API_URL}/api/documents/upload`, formData1, {
      headers: {
        ...formData1.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ First upload successful');
    console.log('Document ID:', upload1.data.documents[0]._id);
    console.log('File Hash:', upload1.data.documents[0].fileHash);

    console.log('\n📤 Step 3: Uploading SAME document again (should be rejected)...');
    const formData2 = new FormData();
    formData2.append('documents', fs.createReadStream(testFile));
    
    try {
      const upload2 = await axios.post(`${API_URL}/api/documents/upload`, formData2, {
        headers: {
          ...formData2.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Check if response indicates duplicate
      if (upload2.data.documents[0].isDuplicate) {
        console.log('✅ DUPLICATE DETECTION WORKING!');
        console.log('Message:', upload2.data.documents[0].message);
        console.log('Original Document ID:', upload2.data.documents[0].duplicateOf);
      } else {
        console.log('❌ DUPLICATE DETECTION FAILED - Document was processed again!');
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('✅ DUPLICATE DETECTION WORKING!');
        console.log('Status:', error.response.status);
        console.log('Message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testDuplicateDetection();
