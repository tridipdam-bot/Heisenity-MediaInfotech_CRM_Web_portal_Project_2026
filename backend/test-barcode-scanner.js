const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestBarcodeData() {
  try {
    console.log('🔧 Creating test barcode data...');

    // Create a test product first
    const testProduct = await prisma.product.create({
      data: {
        sku: 'TEST-SCANNER-001',
        productName: 'Test Scanner Product',
        category: 'Electronics',
        description: 'Test product for barcode scanner',
        price: 99.99,
        stockQuantity: 10,
        location: 'Warehouse A-1',
        createdBy: 'system'
      }
    });

    console.log('✅ Created test product:', testProduct.sku);

    // Create test barcodes
    const testBarcodes = [
      {
        barcodeValue: '1234567890123',
        serialNumber: 'SN001-TEST',
        boxQty: 1,
        productId: testProduct.id
      },
      {
        barcodeValue: '9876543210987',
        serialNumber: 'SN002-TEST',
        boxQty: 5,
        productId: testProduct.id
      },
      {
        barcodeValue: '5555555555555',
        serialNumber: 'SN003-TEST',
        boxQty: 10,
        productId: testProduct.id
      }
    ];

    for (const barcodeData of testBarcodes) {
      const barcode = await prisma.barcode.create({
        data: barcodeData
      });
      console.log(`✅ Created test barcode: ${barcode.barcodeValue} -> ${barcode.serialNumber}`);
    }

    console.log('\n🎯 Test barcodes created successfully!');
    console.log('📱 You can now test the scanner with these barcodes:');
    testBarcodes.forEach(b => {
      console.log(`   - ${b.barcodeValue} (${b.serialNumber})`);
    });

    console.log('\n💡 To test:');
    console.log('1. Open the frontend application');
    console.log('2. Go to Stock Management page');
    console.log('3. Click the barcode scanner button');
    console.log('4. Use a barcode generator app to display one of the test barcodes');
    console.log('5. Scan the barcode with your camera');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupTestData() {
  try {
    console.log('🧹 Cleaning up test barcode data...');

    // Delete test barcodes
    await prisma.barcode.deleteMany({
      where: {
        serialNumber: {
          startsWith: 'SN00'
        }
      }
    });

    // Delete test product
    await prisma.product.deleteMany({
      where: {
        sku: 'TEST-SCANNER-001'
      }
    });

    console.log('✅ Test data cleaned up successfully!');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'cleanup') {
  cleanupTestData();
} else {
  createTestBarcodeData();
}