require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function debugTicketCreationValues() {
  try {
    console.log('Debugging ticket creation values...');
    
    // Login as admin
    const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@company.com',
        adminId: 'ADMIN001',
        password: 'admin123456',
        userType: 'admin'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login data:', {
      id: loginData.id,
      userType: loginData.userType,
      adminId: loginData.adminId
    });
    
    const sessionToken = loginData.sessionToken;

    // Get accepted requests
    const acceptedResponse = await fetch('http://localhost:3001/api/v1/customer-support/my-accepted', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    });

    const acceptedData = await acceptedResponse.json();
    
    if (acceptedData.data.length > 0) {
      const request = acceptedData.data[0];
      console.log('Request details:', {
        id: request.id,
        status: request.status,
        acceptedBy: request.acceptedBy
      });

      // Now let's see what happens when we try to create the ticket
      // We'll add more logging to the backend to see the exact values
      console.log('The issue is likely that:');
      console.log('- employeeId (from user.id) =', loginData.id, '(admin internal ID)');
      console.log('- But assigneeId should be the admin employee record ID');
      console.log('- The admin employee record ID should be:', request.acceptedBy);
    }

  } catch (error) {
    console.error('Error debugging values:', error);
  }
}

debugTicketCreationValues();