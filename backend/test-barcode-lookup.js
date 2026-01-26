// Test the barcode lookup directly
const { Client } = require('pg');

async function testBarcodeAPI() {
  const client = new Client({
    connectionString: "postgresql://TRIDIP:prisma_password@localhost:5432/prisma_db"
  });

  try {
    await client.connect();
    console.log('🧪 Testing barcode lookup API...\n');

    // Get the latest barcode from database
    const latestBarcode = await client.query(`
      SELECT barcode_value, serial_number
      FROM barcodes
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (latestBarcode.rows.length === 0) {
      console.log('❌ No barcodes found in database');
      return;
    }

    const testBarcode = latestBarcode.rows[0].barcode_value;
    console.log(`🔍 Testing with latest barcode: "${testBarcode}"`);

    // Test the API endpoint
    const fetch = require('node-fetch');
    const response = await fetch(`http://localhost:3001/api/v1/products/barcode/${testBarcode}`);
    
    console.log(`📡 API Response Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS! API returned:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorData = await response.text();
      console.log('❌ API Error:');
      console.log(errorData);
    }

    console.log('\n💡 To test your scanner:');
    console.log(`1. Generate a barcode image for: "${testBarcode}"`);
    console.log('2. Use an online barcode generator (like barcode.tec-it.com)');
    console.log('3. Display the generated barcode on your screen');
    console.log('4. Scan it with your barcode scanner');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testBarcodeAPI();