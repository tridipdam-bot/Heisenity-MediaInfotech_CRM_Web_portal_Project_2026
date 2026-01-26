const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugBarcodes() {
  try {
    console.log('🔍 Debugging barcode database...\n');

    // Check all products
    const products = await prisma.product.findMany({
      include: {
        barcodes: true
      }
    });

    console.log(`📦 Found ${products.length} products:`);
    products.forEach(product => {
      console.log(`  - ${product.sku}: ${product.productName} (${product.barcodes.length} barcodes)`);
    });

    console.log('\n🏷️  All barcodes in database:');
    const allBarcodes = await prisma.barcode.findMany({
      include: {
        product: {
          select: {
            sku: true,
            productName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (allBarcodes.length === 0) {
      console.log('   ❌ NO BARCODES FOUND IN DATABASE!');
      console.log('   💡 You need to generate labels first from Product Management');
    } else {
      allBarcodes.forEach(barcode => {
        console.log(`   - Barcode: "${barcode.barcodeValue}"`);
        console.log(`     Serial: "${barcode.serialNumber}"`);
        console.log(`     Product: ${barcode.product.productName} (${barcode.product.sku})`);
        console.log(`     Status: ${barcode.status}`);
        console.log(`     Created: ${barcode.createdAt}`);
        console.log('');
      });
    }

    // Test specific barcodes that were scanned
    const testBarcodes = ['21224089', '21141287'];
    console.log('🧪 Testing specific scanned barcodes:');
    
    for (const testCode of testBarcodes) {
      console.log(`\n   Testing: "${testCode}"`);
      
      const found = await prisma.barcode.findFirst({
        where: {
          OR: [
            { barcodeValue: testCode },
            { serialNumber: testCode }
          ]
        },
        include: {
          product: true
        }
      });

      if (found) {
        console.log(`   ✅ FOUND: ${found.product.productName}`);
      } else {
        console.log(`   ❌ NOT FOUND`);
        
        // Check if it's a partial match
        const partialMatch = await prisma.barcode.findMany({
          where: {
            OR: [
              { barcodeValue: { contains: testCode } },
              { serialNumber: { contains: testCode } }
            ]
          },
          include: {
            product: true
          }
        });

        if (partialMatch.length > 0) {
          console.log(`   🔍 Partial matches found:`);
          partialMatch.forEach(match => {
            console.log(`      - "${match.barcodeValue}" (${match.product.productName})`);
          });
        }
      }
    }

    console.log('\n📊 Database Summary:');
    console.log(`   Products: ${products.length}`);
    console.log(`   Total Barcodes: ${allBarcodes.length}`);
    console.log(`   Active Barcodes: ${allBarcodes.filter(b => b.status === 'AVAILABLE').length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBarcodes();