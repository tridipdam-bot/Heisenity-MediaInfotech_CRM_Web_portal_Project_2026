// Test the exact route that the scanner is calling
const http = require('http');

function testRoute(barcode) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/products/barcode/${barcode}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    console.log(`🔍 Testing: http://localhost:3001${options.path}`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`📡 Status: ${res.statusCode}`);
        console.log(`📄 Response: ${data}`);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Request error: ${error.message}`);
      reject(error);
    });

    req.setTimeout(5000, () => {
      console.error('❌ Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing barcode lookup routes...\n');

  // Test with a known database barcode
  try {
    await testRoute('BX000423');
  } catch (error) {
    console.error('Test failed:', error.message);
  }

  console.log('\n---\n');

  // Test with a non-existent barcode
  try {
    await testRoute('NONEXISTENT');
  } catch (error) {
    console.error('Test failed:', error.message);
  }

  console.log('\n---\n');

  // Test the health endpoint to make sure server is running
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/health',
      method: 'GET'
    };

    console.log('🏥 Testing health endpoint...');
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`📡 Health Status: ${res.statusCode}`);
        console.log(`📄 Health Response: ${data}`);
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Health check failed: ${error.message}`);
    });

    req.end();
  } catch (error) {
    console.error('Health check error:', error.message);
  }
}

runTests();