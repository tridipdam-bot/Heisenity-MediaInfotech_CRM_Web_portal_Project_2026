require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAPITicketCreation() {
  try {
    console.log('Testing API ticket creation...');
    
    // First, let's test admin login to get a session token
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

    if (!loginResponse.ok) {
      console.error('Login failed:', loginResponse.status, await loginResponse.text());
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    const sessionToken = loginData.sessionToken;

    // Get pending support requests
    const pendingResponse = await fetch('http://localhost:3001/api/v1/customer-support/pending', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!pendingResponse.ok) {
      console.error('Failed to get pending requests:', pendingResponse.status, await pendingResponse.text());
      return;
    }

    const pendingData = await pendingResponse.json();
    console.log('✅ Got pending requests:', pendingData.data.length);

    if (pendingData.data.length === 0) {
      console.log('No pending requests to test with');
      return;
    }

    const firstRequest = pendingData.data[0];
    console.log('Testing with request:', firstRequest.id);

    // Accept the request first
    const acceptResponse = await fetch(`http://localhost:3001/api/v1/customer-support/${firstRequest.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!acceptResponse.ok) {
      console.error('Failed to accept request:', acceptResponse.status, await acceptResponse.text());
      return;
    }

    console.log('✅ Request accepted');

    // Now try to create a ticket
    const ticketResponse = await fetch(`http://localhost:3001/api/v1/customer-support/${firstRequest.id}/create-ticket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category: 'OTHER',
        priority: 'MEDIUM',
        dueDate: '',
        estimatedHours: ''
      })
    });

    if (!ticketResponse.ok) {
      const errorText = await ticketResponse.text();
      console.error('❌ Failed to create ticket:', ticketResponse.status, errorText);
      return;
    }

    const ticketData = await ticketResponse.json();
    console.log('✅ Ticket created successfully:', ticketData);

  } catch (error) {
    console.error('❌ Error during API test:', error);
  }
}

testAPITicketCreation();