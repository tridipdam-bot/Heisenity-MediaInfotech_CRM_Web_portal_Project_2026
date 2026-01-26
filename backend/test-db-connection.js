// Simple database connection test
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: "postgresql://TRIDIP:prisma_password@localhost:5432/prisma_db"
  });

  try {
    console.log('🔌 Testing database connection...');
    await client.connect();
    console.log('✅ Database connected successfully!');

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Current time from DB:', result.rows[0].current_time);

    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('products', 'barcodes')
      ORDER BY table_name
    `);
    
    console.log('📋 Relevant tables found:', tables.rows.map(r => r.table_name));

    // Check products count
    try {
      const productCount = await client.query('SELECT COUNT(*) as count FROM products');
      console.log('📦 Products in database:', productCount.rows[0].count);
    } catch (e) {
      console.log('❌ Products table not accessible:', e.message);
    }

    // Check barcodes count
    try {
      const barcodeCount = await client.query('SELECT COUNT(*) as count FROM barcodes');
      console.log('🏷️  Barcodes in database:', barcodeCount.rows[0].count);
      
      // Get sample barcodes
      const sampleBarcodes = await client.query('SELECT barcode_value, serial_number FROM barcodes LIMIT 5');
      console.log('📋 Sample barcodes:');
      sampleBarcodes.rows.forEach(row => {
        console.log(`   - ${row.barcode_value} (${row.serial_number})`);
      });
    } catch (e) {
      console.log('❌ Barcodes table not accessible:', e.message);
    }

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();