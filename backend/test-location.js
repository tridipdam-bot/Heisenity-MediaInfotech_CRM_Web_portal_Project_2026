// Simple test for location validation
import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3001/api/v1';

async function testLocationValidation() {
  try {
    console.log('Testing location validation...');
    
    // Test coordinates for Barrackpore (user location)
    const userLat = 22.7676;
    const userLng = 88.3832;
    
    // Test with employee ID
    const employeeId = 'EMP001';
    
    const response = await fetch(`${BACKEND_URL}/attendance/test-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        latitude: userLat,
        longitude: userLng
      })
    });
    
    const result = await response.json();
    
    console.log('Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error testing location validation:', error);
  }
}

testLocationValidation();