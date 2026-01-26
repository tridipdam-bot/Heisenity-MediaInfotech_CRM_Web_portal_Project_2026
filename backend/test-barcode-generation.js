const bwipjs = require('bwip-js');
const fs = require('fs');

async function testBarcodeGeneration() {
  try {
    console.log('🧪 Testing barcode generation...\n');

    const testValue = 'BX000423';
    console.log(`📝 Generating barcode for: "${testValue}"`);

    // Generate barcode exactly like your system does
    const buffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: testValue,
      scale: 3,
      height: 10,
      includetext: true  // Include text to verify
    });

    // Save to file for inspection
    fs.writeFileSync('test-barcode.png', buffer);
    console.log('✅ Barcode saved as test-barcode.png');

    console.log('\n🔍 Barcode generation details:');
    console.log(`   - Input text: "${testValue}"`);
    console.log(`   - Text length: ${testValue.length}`);
    console.log(`   - Barcode type: code128`);
    console.log(`   - Buffer size: ${buffer.length} bytes`);

    console.log('\n💡 Next steps:');
    console.log('1. Open test-barcode.png');
    console.log('2. Scan it with your barcode scanner');
    console.log('3. Check if it detects "BX000423" or something else');

  } catch (error) {
    console.error('❌ Error generating barcode:', error);
  }
}

testBarcodeGeneration();