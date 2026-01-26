require('dotenv').config();
const { prisma } = require('./src/lib/prisma');

async function createTestData() {
  try {
    console.log('🚀 Creating test inventory data...');

    // Create a test product
    const product = await prisma.product.create({
      data: {
        sku: 'TEST-CAM-001',
        productName: 'Test Security Camera',
        description: 'Test 4K security camera for inventory demo',
        boxQty: 10,
        totalUnits: 100,
        reorderThreshold: 20,
        unitPrice: 15000.00,
        supplier: 'Test Supplier Ltd',
        status: 'ACTIVE'
      }
    });

    console.log('✅ Created product:', product.productName);

    // Create some test barcodes
    const barcodes = [];
    for (let i = 1; i <= 3; i++) {
      const barcode = await prisma.barcode.create({
        data: {
          barcodeValue: `BX00000${i}`,
          serialNumber: `SN-TEST-00${i}`,
          boxQty: 10,
          status: 'AVAILABLE',
          productId: product.id
        }
      });
      barcodes.push(barcode);
      console.log(`✅ Created barcode: ${barcode.barcodeValue}`);
    }

    // Create a test employee if none exists
    let employee = await prisma.employee.findFirst();
    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          name: 'Test Employee',
          employeeId: 'EMP001',
          email: 'test@company.com',
          password: 'hashedpassword',
          phone: '9876543210',
          role: 'FIELD_ENGINEER',
          status: 'ACTIVE'
        }
      });
      console.log('✅ Created test employee:', employee.name);
    } else {
      console.log('✅ Using existing employee:', employee.name);
    }

    // Create some test transactions
    const transactions = [];
    
    // Checkout transaction
    const checkoutTransaction = await prisma.inventoryTransaction.create({
      data: {
        transactionType: 'CHECKOUT',
        checkoutQty: 10,
        returnedQty: 0,
        usedQty: 0,
        remarks: 'Test checkout via barcode scanner',
        barcodeId: barcodes[0].id,
        productId: product.id,
        employeeId: employee.id
      }
    });
    transactions.push(checkoutTransaction);

    // Update barcode status
    await prisma.barcode.update({
      where: { id: barcodes[0].id },
      data: { status: 'CHECKED_OUT' }
    });

    // Create barcode checkout record
    await prisma.barcodeCheckout.create({
      data: {
        barcodeId: barcodes[0].id,
        employeeId: employee.id,
        isReturned: false
      }
    });

    // Create allocation
    await prisma.allocation.create({
      data: {
        employeeId: employee.id,
        productId: product.id,
        allocatedUnits: 10
      }
    });

    console.log('✅ Created checkout transaction');

    // Return transaction
    const returnTransaction = await prisma.inventoryTransaction.create({
      data: {
        transactionType: 'RETURN',
        checkoutQty: 0,
        returnedQty: 5,
        usedQty: 5,
        remarks: 'Partial return - 5 units used in field',
        barcodeId: barcodes[1].id,
        productId: product.id,
        employeeId: employee.id
      }
    });
    transactions.push(returnTransaction);

    console.log('✅ Created return transaction');

    // Adjust transaction
    const adjustTransaction = await prisma.inventoryTransaction.create({
      data: {
        transactionType: 'ADJUST',
        checkoutQty: 0,
        returnedQty: 0,
        usedQty: 2,
        remarks: 'Inventory adjustment - damaged items',
        barcodeId: barcodes[2].id,
        productId: product.id,
        employeeId: employee.id
      }
    });
    transactions.push(adjustTransaction);

    console.log('✅ Created adjust transaction');

    console.log('\n🎉 Test data created successfully!');
    console.log(`📦 Product: ${product.productName} (${product.sku})`);
    console.log(`📊 Barcodes: ${barcodes.length}`);
    console.log(`📈 Transactions: ${transactions.length}`);
    console.log(`👤 Employee: ${employee.name} (${employee.employeeId})`);

    console.log('\n🔍 Sample barcodes for testing:');
    barcodes.forEach(barcode => {
      console.log(`  - ${barcode.barcodeValue} (${barcode.serialNumber})`);
    });

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();