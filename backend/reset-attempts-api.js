// Reset attempts using API
import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3001/api/v1';

async function resetAttempts(employeeId) {
  try {
    console.log(`Resetting attempts for employee: ${employeeId}`);
    
    // Use the bypass endpoint to create a dummy attendance record that resets attempts
    const response = await fetch(`${BACKEND_URL}/attendance/bypass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        latitude: 0,
        longitude: 0,
        status: 'PRESENT',
        location: 'Reset Attempts - Test Location'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Attempts reset successfully');
    } else {
      console.log('Failed to reset attempts:', result.error);
    }
    
  } catch (error) {
    console.error('Error resetting attempts:', error);
  }
}

// Get employee ID from command line argument
const employeeId = process.argv[2];
if (!employeeId) {
  console.log('Usage: node reset-attempts-api.js <employeeId>');
  process.exit(1);
}

resetAttempts(employeeId);