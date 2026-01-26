// Check the actual schema of barcodes table
const { Client } = require('pg');

async function checkSchema() {
  const client = new Client({
    connectionString: "postgresql://TRIDIP:prisma_password@localhost:5432/prisma_db"
  });

  try {
    await client.connect();
    console.log('🔍 Checking barcodes table schema...\n');

    // Get table structure
    const schema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'barcodes'
      ORDER BY ordinal_position
    `);

    console.log('📋 Barcodes table columns:');
    schema.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Get a sample record to see actual data
    console.log('\n📋 Sample barcode record:');
    const sample = await client.query('SELECT * FROM barcodes LIMIT 1');
    if (sample.rows.length > 0) {
      console.log('Sample record:', sample.rows[0]);
    }

    // Now search for the specific barcodes with correct column names
    console.log('\n🔍 Searching for scanned barcodes...');
    const scannedCodes = ['21224089', '21141287'];

    for (const code of scannedCodes) {
      console.log(`\n🔍 Looking for: "${code}"`);
      
      const result = await client.query(`
        SELECT * FROM barcodes 
        WHERE barcode_value = $1 OR serial_number = $1
      `, [code]);

      if (result.rows.length > 0) {
        console.log('✅ FOUND:');
        result.rows.forEach(row => {
          console.log(`   - Barcode: ${row.barcode_value}`);
          console.log(`   - Serial: ${row.serial_number}`);
        });
      } else {
        console.log('❌ Not found');
      }
    }

    // Show what barcodes actually exist
    console.log('\n📋 Latest 10 barcodes in database:');
    const latest = await client.query(`
      SELECT barcode_value, serial_number, created_at
      FROM barcodes
      ORDER BY created_at DESC
      LIMIT 10
    `);

    latest.rows.forEach(row => {
      console.log(`   - "${row.barcode_value}" (${row.serial_number}) - ${row.created_at}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();