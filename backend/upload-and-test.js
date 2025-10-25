const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5001';

// File location
const TEST_FILE = path.join(__dirname, 'uploads', 'financial', '68fb581cab185e0313081680', '1761394583855_Statement_OCT2025_060858597_unlocked.pdf');

async function uploadAndTest() {
  try {
    console.log('='.repeat(70));
    console.log('UPLOADING PDF TO TEST DUPLICATE DETECTION & ENHANCED PARSER');
    console.log('='.repeat(70));
    console.log();

    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'hemakotibonthada@gmail.com',
      password: 'Bontha@0906'  // Update if needed
    });
    
    const token = loginRes.data.token;
    console.log('✅ Logged in successfully');
    console.log('User:', loginRes.data.user.name);
    console.log();

    // Step 2: First upload
    console.log('Step 2: Uploading PDF (first time)...');
    console.log('File:', path.basename(TEST_FILE));
    
    const formData1 = new FormData();
    formData1.append('documents', fs.createReadStream(TEST_FILE));
    
    const upload1 = await axios.post(`${API_URL}/api/documents/upload`, formData1, {
      headers: {
        ...formData1.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ First upload successful');
    console.log('Document ID:', upload1.data.documents[0]._id);
    console.log('File Hash:', upload1.data.documents[0].fileHash);
    console.log('Status:', upload1.data.documents[0].processingStatus);
    console.log();

    // Step 3: Wait for processing
    console.log('Step 3: Waiting 20 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    console.log('✅ Wait complete');
    console.log();

    // Step 4: Try uploading same file again
    console.log('Step 4: Uploading SAME PDF again (should be rejected)...');
    
    const formData2 = new FormData();
    formData2.append('documents', fs.createReadStream(TEST_FILE));
    
    try {
      const upload2 = await axios.post(`${API_URL}/api/documents/upload`, formData2, {
        headers: {
          ...formData2.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (upload2.data.documents[0].isDuplicate) {
        console.log('✅ DUPLICATE DETECTION WORKING!');
        console.log('Message:', upload2.data.documents[0].message);
        console.log('Duplicate of:', upload2.data.documents[0].duplicateOf);
      } else {
        console.log('❌ DUPLICATE NOT DETECTED - File was processed again');
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('✅ DUPLICATE DETECTION WORKING!');
        console.log('Status Code:', error.response.status);
        console.log('Message:', error.response.data.message);
      } else {
        throw error;
      }
    }

    console.log();
    console.log('='.repeat(70));
    console.log('Upload complete! Run analyze-results.js to check extraction');
    console.log('='.repeat(70));

  } catch (error) {
    if (error.response) {
      console.error('❌ Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

uploadAndTest();
