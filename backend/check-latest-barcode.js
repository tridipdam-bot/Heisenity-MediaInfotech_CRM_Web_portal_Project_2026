const { Client } = require('pg');

async function checkLatestBarcode() {
  const client = new Client({
    connectionString: "postgresql://TRIDIP:prisma_password@localhost:5432/prisma_db"
  });

  try {
    await client.connect();
    console.log('🔍 Checking latest barcodes in database...\n');

    // Get the latest 10 barcodes
    const latest = await client.query(`
      SELECT barcode_value, serial_number, created_at
      FROM barcodes
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('📋 Latest 10 barcodes:');
    latest.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.barcode_value} (${row.serial_number}) - ${row.created_at}`);
    });

    // Check total count
    const count = await client.query('SELECT COUNT(*) as total FROM barcodes');
    console.log(`\n📊 Total barcodes in database: ${count.rows[0].total}`);

    // Check if BX000423 exists
    const specific = await client.query(`
      SELECT barcode_value, serial_number, created_at
      FROM barcodes
      WHERE barcode_value = 'BX000423' OR serial_number = 'BX000423'
    `);

    if (specific.rows.length > 0) {
      console.log('\n✅ BX000423 EXISTS in database:');
      specific.rows.forEach(row => {
        console.log(`   - ${row.barcode_value} (${row.serial_number}) - ${row.created_at}`);
      });
    } else {
      console.log('\n❌ BX000423 does NOT exist in database');
      console.log('💡 You need to generate more labels to reach BX000423');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkLatestBarcode();