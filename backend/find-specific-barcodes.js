// Find specific barcodes that were scanned
const { Client } = require('pg');

async function findSpecificBarcodes() {
  const client = new Client({
    connectionString: "postgresql://TRIDIP:prisma_password@localhost:5432/prisma_db"
  });

  try {
    await client.connect();
    console.log('🔍 Searching for specific scanned barcodes...\n');

    const scannedCodes = ['21224089', '21141287'];

    for (const code of scannedCodes) {
      console.log(`🔍 Looking for: "${code}"`);
      
      // Exact match
      const exact = await client.query(`
        SELECT b.barcode_value, b.serial_number, p.product_name, p.sku
        FROM barcodes b
        JOIN products p ON b.product_id = p.id
        WHERE b.barcode_value = $1 OR b.serial_number = $1
      `, [code]);

      if (exact.rows.length > 0) {
        console.log('✅ EXACT MATCH FOUND:');
        exact.rows.forEach(row => {
          console.log(`   - Barcode: ${row.barcode_value}`);
          console.log(`   - Serial: ${row.serial_number}`);
          console.log(`   - Product: ${row.product_name} (${row.sku})`);
        });
      } else {
        console.log('❌ No exact match found');
        
        // Partial match
        const partial = await client.query(`
          SELECT b.barcode_value, b.serial_number, p.product_name, p.sku
          FROM barcodes b
          JOIN products p ON b.product_id = p.id
          WHERE b.barcode_value LIKE $1 OR b.serial_number LIKE $1
          LIMIT 5
        `, [`%${code}%`]);

        if (partial.rows.length > 0) {
          console.log('🔍 Partial matches found:');
          partial.rows.forEach(row => {
            console.log(`   - ${row.barcode_value} (${row.product_name})`);
          });
        } else {
          console.log('❌ No partial matches either');
        }
      }
      console.log('');
    }

    // Show what barcodes actually exist
    console.log('📋 What barcodes DO exist in your database:');
    const allBarcodes = await client.query(`
      SELECT b.barcode_value, b.serial_number, p.product_name, p.sku
      FROM barcodes b
      JOIN products p ON b.product_id = p.id
      ORDER BY b.created_at DESC
      LIMIT 10
    `);

    allBarcodes.rows.forEach(row => {
      console.log(`   - "${row.barcode_value}" -> ${row.product_name} (${row.sku})`);
    });

    console.log('\n💡 SOLUTION:');
    console.log('1. Generate labels from your Product Management page');
    console.log('2. Print the generated PDF labels');
    console.log('3. Scan the PRINTED labels (not external barcodes)');
    console.log('4. Your generated barcodes will be like: BX000001, BX000002, etc.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

findSpecificBarcodes();