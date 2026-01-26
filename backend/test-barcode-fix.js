const bwipjs = require('bwip-js');
const fs = require('fs');

async function testBarcodeWithOptions() {
  try {
    console.log('🧪 Testing barcode generation with different options...\n');

    const testValue = 'BX000423';
    
    // Test 1: Original method
    console.log('📝 Test 1: Original method');
    try {
      const buffer1 = await bwipjs.toBuffer({
        bcid: 'code128',
        text: testValue,
        scale: 3,
        height: 10,
        includetext: true
      });
      fs.writeFileSync('test-barcode-original.png', buffer1);
      console.log('✅ Original method: test-barcode-original.png');
    } catch (e) {
      console.log('❌ Original method failed:', e.message);
    }

    // Test 2: With encoding options
    console.log('\n📝 Test 2: With encoding options');
    try {
      const buffer2 = await bwipjs.toBuffer({
        bcid: 'code128',
        text: testValue,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
        parsefnc: true,
        encoding: 'utf8'
      });
      fs.writeFileSync('test-barcode-encoded.png', buffer2);
      console.log('✅ Encoded method: test-barcode-encoded.png');
    } catch (e) {
      console.log('❌ Encoded method failed:', e.message);
    }

    // Test 3: Different barcode type
    console.log('\n📝 Test 3: Code39 (alternative)');
    try {
      const buffer3 = await bwipjs.toBuffer({
        bcid: 'code39',
        text: testValue,
        scale: 3,
        height: 10,
        includetext: true
      });
      fs.writeFileSync('test-barcode-code39.png', buffer3);
      console.log('✅ Code39 method: test-barcode-code39.png');
    } catch (e) {
      console.log('❌ Code39 method failed:', e.message);
    }

    // Test 4: Numeric only (to see if letters are the issue)
    console.log('\n📝 Test 4: Numeric only test');
    try {
      const numericValue = '000423';
      const buffer4 = await bwipjs.toBuffer({
        bcid: 'code128',
        text: numericValue,
        scale: 3,
        height: 10,
        includetext: true
      });
      fs.writeFileSync('test-barcode-numeric.png', buffer4);
      console.log('✅ Numeric method: test-barcode-numeric.png');
    } catch (e) {
      console.log('❌ Numeric method failed:', e.message);
    }

    console.log('\n💡 Test all generated barcodes with your scanner to see which one works correctly!');

  } catch (error) {
    console.error('❌ Error in barcode testing:', error);
  }
}

testBarcodeWithOptions();