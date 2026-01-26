const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestBarcodes() {
  try {
    console.log('🔧 Adding test barcode data...');

    // Create or find test product
    let testProduct = await prisma.product.findFirst({
      where: { sku: 'TEST-SCANNER-001' }
    });

    if (!testProduct) {
      testProduct = await prisma.product.create({
        data: {
          sku: 'TEST-SCANNER-001',
          productName: 'Test Scanner Product',
          description: 'Product for testing barcode scanner',
          boxQty: 1,
          totalUnits: 100,
          reorderThreshold: 10,
          isActive: true
        }
      });
      console.log('✅ Created test product:', testProduct.sku);
    } else {
      console.log('✅ Using existing test product:', testProduct.sku);
    }

    // Test barcodes to add (including the one you scanned)
    const testBarcodes = [
      {
        barcodeValue: '21141287', // The one from your scan
        serialNumber: 'SN-21141287',
        boxQty: 1,
        status: 'AVAILABLE',
        productId: testProduct.id
      },
      {
        barcodeValue: '1234567890123',
        serialNumber: 'SN-1234567890123',
        boxQty: 5,
        status: 'AVAILABLE',
        productId: testProduct.id
      },
      {
        barcodeValue: '9876543210987',
        serialNumber: 'SN-9876543210987',
        boxQty: 10,
        status: 'AVAILABLE',
        productId: testProduct.id
      },
      {
        barcodeValue: '5555555555555',
        serialNumber: 'SN-5555555555555',
        boxQty: 2,
        status: 'AVAILABLE',
        productId: testProduct.id
      }
    ];

    for (const barcodeData of testBarcodes) {
      try {
        // Check if barcode already exists
        const existing = await prisma.barcode.findFirst({
          where: {
            OR: [
              { barcodeValue: barcodeData.barcodeValue },
              { serialNumber: barcodeData.serialNumber }
            ]
          }
        });

        if (existing) {
          console.log(`⚠️  Barcode ${barcodeData.barcodeValue} already exists`);
          continue;
        }

        const barcode = await prisma.barcode.create({
          data: barcodeData
        });
        console.log(`✅ Created barcode: ${barcode.barcodeValue} -> ${barcode.serialNumber}`);
      } catch (error) {
        console.error(`❌ Error creating barcode ${barcodeData.barcodeValue}:`, error.message);
      }
    }

    console.log('\n🎯 Test barcodes ready!');
    console.log('📱 You can now test the scanner with these barcodes:');
    
    // List all test barcodes
    const allTestBarcodes = await prisma.barcode.findMany({
      where: { productId: testProduct.id },
      include: { product: true }
    });

    allTestBarcodes.forEach(b => {
      console.log(`   - ${b.barcodeValue} (${b.serialNumber}) - ${b.product.productName}`);
    });

    console.log('\n💡 To test the scanner:');
    console.log('1. Use a barcode generator app or website');
    console.log('2. Generate a barcode for one of the values above');
    console.log('3. Open the scanner in your app');
    console.log('4. Point your camera at the generated barcode');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if we want to clean up instead
if (process.argv[2] === 'cleanup') {
  async function cleanup() {
    try {
      console.log('🧹 Cleaning up test data...');
      
      await prisma.barcode.deleteMany({
        where: {
          product: {
            sku: 'TEST-SCANNER-001'
          }
        }
      });

      await prisma.product.deleteMany({
        where: {
          sku: 'TEST-SCANNER-001'
        }
      });

      console.log('✅ Test data cleaned up!');
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
  cleanup();
} else {
  addTestBarcodes();
}