const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEmployees() {
  try {
    console.log('🔍 Checking employees in database...');

    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        name: true,
        employeeId: true,
        email: true,
        role: true,
        status: true
      }
    });

    console.log(`📊 Found ${employees.length} employees:`);
    
    if (employees.length === 0) {
      console.log('❌ No employees found in database');
      console.log('💡 You may need to create some employees first');
    } else {
      employees.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.name} (${emp.employeeId}) - ${emp.role} - ${emp.status}`);
      });
    }

    // Also check customers
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        customerId: true,
        phone: true,
        status: true
      }
    });

    console.log(`\n📊 Found ${customers.length} customers:`);
    
    if (customers.length === 0) {
      console.log('❌ No customers found in database');
      console.log('💡 You may need to create some customers first');
    } else {
      customers.forEach((cust, index) => {
        console.log(`${index + 1}. ${cust.name} (${cust.customerId}) - ${cust.phone} - ${cust.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking employees:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmployees();