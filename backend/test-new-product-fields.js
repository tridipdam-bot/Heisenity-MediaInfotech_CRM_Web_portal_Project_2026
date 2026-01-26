const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNewProductFields() {
  try {
    console.log('🧪 Testing new product fields...');
    
    // Create a test product with new fields
    const testProduct = await prisma.product.create({
      data: {
        sku: 'TEST-001',
        productName: '4K Security Camera - Model X1',
        description: 'High-resolution security camera with night vision',
        boxQty: 1,
        totalUnits: 245,
        unitPrice: 24999.00,
        supplier: 'TechSupply Co.',
        status: 'ACTIVE'
      }
    });

    console.log('✅ Test product created:', {
      id: testProduct.id.toString(),
      sku: testProduct.sku,
      productName: testProduct.productName,
      unitPrice: testProduct.unitPrice?.toString(),
      supplier: testProduct.supplier,
      status: testProduct.status,
      totalValue: testProduct.unitPrice ? (parseFloat(testProduct.unitPrice.toString()) * testProduct.totalUnits).toFixed(2) : null
    });

    // Fetch the product to verify
    const fetchedProduct = await prisma.product.findUnique({
      where: { id: testProduct.id }
    });

    console.log('✅ Product fetched successfully:', {
      unitPrice: fetchedProduct?.unitPrice?.toString(),
      supplier: fetchedProduct?.supplier,
      status: fetchedProduct?.status
    });

    // Clean up
    await prisma.product.delete({
      where: { id: testProduct.id }
    });

    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewProductFields();