const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedTestData() {
  try {
    console.log('🌱 Seeding test data...');

    // Check if employees exist
    const existingEmployees = await prisma.employee.count();
    
    if (existingEmployees === 0) {
      console.log('📝 Creating test employees...');
      
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const employees = [
        {
          name: 'John Doe',
          employeeId: 'EMP001',
          email: 'john.doe@company.com',
          password: hashedPassword,
          phone: '+1234567890',
          role: 'FIELD_ENGINEER',
          status: 'ACTIVE'
        },
        {
          name: 'Jane Smith',
          employeeId: 'EMP002',
          email: 'jane.smith@company.com',
          password: hashedPassword,
          phone: '+1234567891',
          role: 'IN_OFFICE',
          status: 'ACTIVE'
        },
        {
          name: 'Mike Johnson',
          employeeId: 'EMP003',
          email: 'mike.johnson@company.com',
          password: hashedPassword,
          phone: '+1234567892',
          role: 'FIELD_ENGINEER',
          status: 'ACTIVE'
        },
        {
          name: 'Sarah Wilson',
          employeeId: 'EMP004',
          email: 'sarah.wilson@company.com',
          password: hashedPassword,
          phone: '+1234567893',
          role: 'IN_OFFICE',
          status: 'ACTIVE'
        }
      ];

      for (const empData of employees) {
        const employee = await prisma.employee.create({
          data: empData
        });
        console.log(`✅ Created employee: ${employee.name} (${employee.employeeId})`);
      }
    } else {
      console.log(`✅ Found ${existingEmployees} existing employees`);
    }

    // Check if customers exist
    const existingCustomers = await prisma.customer.count();
    
    if (existingCustomers === 0) {
      console.log('📝 Creating test customers...');
      
      const customers = [
        {
          customerId: 'CUST001',
          name: 'ABC Corporation',
          phone: '+1987654321',
          email: 'contact@abc-corp.com',
          address: '123 Business St, City, State 12345',
          createdBy: 'system'
        },
        {
          customerId: 'CUST002',
          name: 'XYZ Industries',
          phone: '+1987654322',
          email: 'info@xyz-industries.com',
          address: '456 Industrial Ave, City, State 12346',
          createdBy: 'system'
        },
        {
          customerId: 'CUST003',
          name: 'Tech Solutions Ltd',
          phone: '+1987654323',
          email: 'hello@techsolutions.com',
          address: '789 Tech Park, City, State 12347',
          createdBy: 'system'
        }
      ];

      for (const custData of customers) {
        const customer = await prisma.customer.create({
          data: custData
        });
        console.log(`✅ Created customer: ${customer.name} (${customer.customerId})`);
      }
    } else {
      console.log(`✅ Found ${existingCustomers} existing customers`);
    }

    console.log('🎉 Test data seeding completed!');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();