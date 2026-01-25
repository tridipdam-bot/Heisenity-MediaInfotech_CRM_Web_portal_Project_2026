const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCustomerSupportAccept() {
  try {
    console.log('Testing customer support request acceptance...');
    
    // Find a pending customer support request
    const pendingRequest = await prisma.customerSupportRequest.findFirst({
      where: { status: 'PENDING' },
      include: {
        customer: true
      }
    });

    if (!pendingRequest) {
      console.log('No pending customer support requests found');
      
      // Create a test customer and request
      console.log('Creating test customer and support request...');
      
      const testCustomer = await prisma.customer.create({
        data: {
          customerId: 'TEST001',
          name: 'Test Customer',
          phone: '1234567890',
          email: 'test@example.com',
          createdBy: 'SYSTEM'
        }
      });

      const testRequest = await prisma.customerSupportRequest.create({
        data: {
          customerId: testCustomer.id,
          message: 'Test support request',
          status: 'PENDING'
        }
      });

      console.log('Created test request:', testRequest);
      return;
    }

    console.log('Found pending request:', pendingRequest);

    // Find an admin or in-office employee
    const admin = await prisma.admin.findFirst({
      select: { id: true, adminId: true, name: true, email: true }
    });

    const inOfficeEmployee = await prisma.employee.findFirst({
      where: { role: 'IN_OFFICE', status: 'ACTIVE' },
      select: { id: true, employeeId: true, name: true }
    });

    console.log('Found admin:', admin);
    console.log('Found in-office employee:', inOfficeEmployee);

    if (admin) {
      console.log('Testing admin acceptance...');
      
      // Create admin employee record if needed
      const adminEmployeeId = `ADMIN_${admin.adminId}`;
      let adminEmployee = await prisma.employee.findUnique({
        where: { employeeId: adminEmployeeId },
        select: { id: true }
      });

      if (!adminEmployee) {
        adminEmployee = await prisma.employee.create({
          data: {
            name: `${admin.name} (Admin)`,
            employeeId: adminEmployeeId,
            email: admin.email,
            password: 'N/A',
            role: 'IN_OFFICE',
            status: 'ACTIVE'
          },
          select: { id: true }
        });
        console.log('Created admin employee record:', adminEmployee);
      }

      // Test accepting the request
      const updatedRequest = await prisma.customerSupportRequest.update({
        where: { id: pendingRequest.id },
        data: {
          status: 'ACCEPTED',
          acceptedBy: adminEmployee.id
        }
      });

      console.log('✅ Successfully accepted request:', updatedRequest);
    } else if (inOfficeEmployee) {
      console.log('Testing employee acceptance...');
      
      const updatedRequest = await prisma.customerSupportRequest.update({
        where: { id: pendingRequest.id },
        data: {
          status: 'ACCEPTED',
          acceptedBy: inOfficeEmployee.id
        }
      });

      console.log('✅ Successfully accepted request:', updatedRequest);
    } else {
      console.log('No admin or in-office employee found for testing');
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCustomerSupportAccept();