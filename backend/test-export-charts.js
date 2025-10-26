/**
 * Test Export Charts
 * Verify that both PDF and Excel exports include charts
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function testExportCharts() {
  console.log('🧪 Testing Export Charts...\n');

  const baseURL = 'http://localhost:5001';
  
  // Login first to get token
  try {
    // Try to register first (might already exist)
    try {
      await axios.post(`${baseURL}/api/auth/register`, {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'testpassword123'
      });
      console.log('✅ User registered\n');
    } catch (regErr) {
      // User might already exist, that's okay
      if (regErr.response && regErr.response.status !== 409) {
        console.log('ℹ️  Registration skipped (user might exist)\n');
      }
    }

    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'testuser@example.com',
      password: 'testpassword123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully\n');

    // Test 1: Export PDF
    console.log('📄 Testing PDF Export...');
    const pdfResponse = await axios.get(`${baseURL}/api/emi/export/pdf`, {
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'arraybuffer'
    });

    if (pdfResponse.status === 200) {
      const pdfPath = path.join(__dirname, 'test_emi_export.pdf');
      fs.writeFileSync(pdfPath, pdfResponse.data);
      console.log(`✅ PDF exported successfully: ${pdfPath}`);
      console.log(`   Size: ${(pdfResponse.data.length / 1024).toFixed(2)} KB`);
      
      // Check if PDF contains image data (charts)
      const pdfContent = pdfResponse.data.toString('binary');
      const hasImages = pdfContent.includes('/Type /XObject') || pdfContent.includes('/Subtype /Image');
      console.log(`   📊 Contains charts: ${hasImages ? '✅ YES' : '❌ NO'}`);
    } else {
      console.error('❌ PDF export failed:', pdfResponse.status);
    }

    console.log('');

    // Test 2: Export Excel
    console.log('📊 Testing Excel Export...');
    const excelResponse = await axios.get(`${baseURL}/api/emi/export/excel`, {
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'arraybuffer'
    });

    if (excelResponse.status === 200) {
      const excelPath = path.join(__dirname, 'test_emi_export.xlsx');
      fs.writeFileSync(excelPath, excelResponse.data);
      console.log(`✅ Excel exported successfully: ${excelPath}`);
      console.log(`   Size: ${(excelResponse.data.length / 1024).toFixed(2)} KB`);
      
      // Check if Excel contains PNG image data (charts)
      const excelContent = excelResponse.data.toString('binary');
      const hasImages = excelContent.includes('PNG') || excelContent.includes('\x89PNG');
      console.log(`   📊 Contains charts: ${hasImages ? '✅ YES' : '❌ NO'}`);
    } else {
      console.error('❌ Excel export failed:', excelResponse.status);
    }

    console.log('\n✅ All export tests completed!');
  } catch (err) {
    console.error('❌ Test error:', err.message);
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Data:', Buffer.isBuffer(err.response.data) ? 'Binary data' : err.response.data);
    }
    if (err.code) {
      console.error('   Error code:', err.code);
    }
    if (err.stack) {
      console.error('   Stack:', err.stack);
    }
    process.exit(1);
  }
}

// Run tests
testExportCharts();
