require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testFullCustomerSupportFlow() {
  try {
    console.log('Testing full customer support flow...');
    
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

    // Check for accepted requests first
    const acceptedResponse = await fetch('http://localhost:3001/api/v1/customer-support/my-accepted', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (acceptedResponse.ok) {
      const acceptedData = await acceptedResponse.json();
      console.log('✅ Got accepted requests:', acceptedData.data.length);
      
      if (acceptedData.data.length > 0) {
        const acceptedRequest = acceptedData.data[0];
        console.log('Testing ticket creation with accepted request:', acceptedRequest.id);

        // Try to create a ticket from the accepted request
        const ticketResponse = await fetch(`http://localhost:3001/api/v1/customer-support/${acceptedRequest.id}/create-ticket`, {
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
          
          // Let's check the backend logs for more details
          console.log('Checking backend logs for detailed error information...');
          return;
        }

        const ticketData = await ticketResponse.json();
        console.log('✅ Ticket created successfully:', ticketData);
        return;
      }
    }

    // If no accepted requests, check pending requests
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
      console.log('No pending or accepted requests to test with. Creating a test customer support request...');
      
      // We would need to create a customer support request here, but that requires customer authentication
      // For now, let's just report that we need test data
      console.log('❌ No test data available. Please create a customer support request through the customer portal first.');
      return;
    }

    const firstRequest = pendingData.data[0];
    console.log('Testing with pending request:', firstRequest.id);

    // Accept the request first
    const acceptResponse = await fetch(`http://localhost:3001/api/v1/customer-support/${firstRequest.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!acceptResponse.ok) {
      const errorText = await acceptResponse.text();
      console.error('❌ Failed to accept request:', acceptResponse.status, errorText);
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
      console.log('Response body:', errorText);
      return;
    }

    const ticketData = await ticketResponse.json();
    console.log('✅ Ticket created successfully:', ticketData);

  } catch (error) {
    console.error('❌ Error during full flow test:', error);
  }
}

testFullCustomerSupportFlow();