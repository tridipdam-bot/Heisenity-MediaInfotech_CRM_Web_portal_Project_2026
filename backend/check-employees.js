const { PrismaClient } = require('@prisma/client');

async function checkEmployees() {
  const prisma = new PrismaClient();
  
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true
      }
    });
    
    console.log('Total employees:', employees.length);
    employees.forEach(emp => {
      console.log(`- ${emp.name} (${emp.employeeId}) - ID: ${emp.id}`);
    });
    
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        adminId: true,
        name: true,
        email: true
      }
    });
    
    console.log('\nTotal admins:', admins.length);
    admins.forEach(admin => {
      console.log(`- ${admin.name} (${admin.adminId}) - ID: ${admin.id}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmployees();