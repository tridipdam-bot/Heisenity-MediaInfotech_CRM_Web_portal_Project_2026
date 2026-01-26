const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestBarcode() {
  try {
    console.log('🔧 Creating test barcode data...');

    // First, let's check if we have any products
    const existingProducts = await prisma.product.findMany({
      take: 1
    });

    let testProduct;
    
    if (existingProducts.length === 0) {
      // Create a test product
      testProduct = await prisma.product.create({
        data: {
          sku: 'TEST-001',
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
    } else {
      testProduct = existingProducts[0];
      console.log('✅ Using existing product:', testProduct.sku);
    }

    // Create test barcodes that match common barcode formats
    const testBarcodes = [
      {
        barcodeValue: '52708749', // The one from your error
        serialNumber: 'SN-52708749',
        boxQty: 1,
        productId: testProduct.id
      },
      {
        barcodeValue: '1234567890123',
        serialNumber: 'SN-1234567890123',
        boxQty: 5,
        productId: testProduct.id
      },
      {
        barcodeValue: '9876543210987',
        serialNumber: 'SN-9876543210987',
        boxQty: 10,
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
    testBarcodes.forEach(b => {
      console.log(`   - ${b.barcodeValue} (${b.serialNumber})`);
    });

    // Test the lookup function
    console.log('\n🧪 Testing barcode lookup...');
    const testBarcode = await prisma.barcode.findFirst({
      where: {
        barcodeValue: '52708749'
      },
      include: {
        product: true
      }
    });

    if (testBarcode) {
      console.log('✅ Barcode lookup test successful:', testBarcode.product.productName);
    } else {
      console.log('❌ Barcode lookup test failed');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestBarcode();