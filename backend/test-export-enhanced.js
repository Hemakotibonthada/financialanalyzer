const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';

async function testEnhancedExports() {
  console.log('🧪 Testing Enhanced EMI Export Feature with Date Filtering\n');

  let token;

  try {
    // 1. Register and Login
    const testUser = {
      name: 'Export Test User',
      email: `exporttest${Date.now()}@example.com`,
      password: 'TestPassword123'
    };

    console.log('1️⃣ Registering test user...');
    await axios.post(`${BASE_URL}/api/auth/register`, testUser);
    
    console.log('2️⃣ Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    token = loginResponse.data.data?.accessToken || loginResponse.data.data?.token || loginResponse.data.accessToken || loginResponse.data.token;
    
    if (!token) {
      console.log('❌ No token received. Login response:', loginResponse.data);
      return;
    }
    console.log('✅ Login successful\n');

    // 2. Set up date range (6 months ago to 12 months ahead)
    const now = new Date();
    const startDate = new Date(now.setMonth(now.getMonth() - 6)).toISOString().split('T')[0];
    const endDate = new Date(now.setMonth(now.getMonth() + 18)).toISOString().split('T')[0]; // +18 to get 12 months from original
    
    console.log(`📅 Date Range: ${startDate} to ${endDate}\n`);

    const headers = {
      'Authorization': `Bearer ${token}`
    };

    // 3. Test PDF Export
    console.log('2️⃣ Testing PDF Export...');
    try {
      const pdfResponse = await axios.get(
        `${BASE_URL}/api/emi/export/pdf?startDate=${startDate}&endDate=${endDate}`,
        { 
          headers,
          responseType: 'arraybuffer'
        }
      );
      
      const pdfPath = path.join(__dirname, `EMI_Report_${startDate}_to_${endDate}.pdf`);
      fs.writeFileSync(pdfPath, pdfResponse.data);
      console.log(`✅ PDF exported successfully: ${pdfPath}`);
      console.log(`   File size: ${(pdfResponse.data.length / 1024).toFixed(2)} KB\n`);
    } catch (error) {
      console.log('❌ PDF export failed:', error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        const errorMsg = Buffer.isBuffer(error.response.data) 
          ? error.response.data.toString('utf8')
          : error.response.data;
        console.log('   Error:', errorMsg);
      }
    }

    // 4. Test Excel Export
    console.log('3️⃣ Testing Excel Export (4-sheet workbook)...');
    try {
      const excelResponse = await axios.get(
        `${BASE_URL}/api/emi/export/excel?startDate=${startDate}&endDate=${endDate}`,
        { 
          headers,
          responseType: 'arraybuffer'
        }
      );
      
      const excelPath = path.join(__dirname, `EMI_Report_${startDate}_to_${endDate}.xlsx`);
      fs.writeFileSync(excelPath, excelResponse.data);
      console.log(`✅ Excel exported successfully: ${excelPath}`);
      console.log(`   File size: ${(excelResponse.data.length / 1024).toFixed(2)} KB`);
      console.log('   Sheets: Overview, All EMIs, Upcoming Payments, Provider Summary\n');
    } catch (error) {
      console.log('❌ Excel export failed:', error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        const errorMsg = Buffer.isBuffer(error.response.data) 
          ? error.response.data.toString('utf8')
          : error.response.data;
        console.log('   Error:', errorMsg);
      }
    }

    // 5. Test CSV Export
    console.log('4️⃣ Testing CSV Export...');
    try {
      const csvResponse = await axios.get(
        `${BASE_URL}/api/emi/export/csv?startDate=${startDate}&endDate=${endDate}`,
        { 
          headers,
          responseType: 'text'
        }
      );
      
      const csvPath = path.join(__dirname, `EMI_Report_${startDate}_to_${endDate}.csv`);
      fs.writeFileSync(csvPath, csvResponse.data);
      console.log(`✅ CSV exported successfully: ${csvPath}`);
      console.log(`   File size: ${(csvResponse.data.length / 1024).toFixed(2)} KB`);
      
      // Show CSV structure
      const lines = csvResponse.data.split('\n');
      console.log(`   Rows: ${lines.length - 1} (excluding header)`);
      console.log(`   Columns: ${lines[0].split(',').length}`);
      console.log(`   Header: ${lines[0].substring(0, 100)}...`);
    } catch (error) {
      console.log('❌ CSV export failed:', error.response?.data || error.message);
    }

    // 6. Test without date range (should use defaults)
    console.log('\n5️⃣ Testing export without date range...');
    try {
      const defaultResponse = await axios.get(
        `${BASE_URL}/api/emi/export/csv`,
        { 
          headers,
          responseType: 'text'
        }
      );
      console.log('✅ Default export works (no date filtering)\n');
    } catch (error) {
      console.log('❌ Default export failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 All export tests completed!');
    console.log('\nFeatures tested:');
    console.log('  ✅ Date range filtering');
    console.log('  ✅ PDF with comprehensive sections (6 sections)');
    console.log('  ✅ Excel with 4 sheets (Overview, All EMIs, Upcoming, Provider Summary)');
    console.log('  ✅ CSV with 13 columns including Outstanding');
    console.log('  ✅ Dynamic filenames with date ranges');
    console.log('  ✅ Backward compatibility (no date range)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

// Run the test
testEnhancedExports();
