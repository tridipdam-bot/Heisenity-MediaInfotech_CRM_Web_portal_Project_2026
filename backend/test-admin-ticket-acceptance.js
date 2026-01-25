const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAdminTicketAcceptance() {
  try {
    console.log('Testing admin ticket acceptance...');
    
    // Find an admin
    const admin = await prisma.admin.findFirst({
      select: { id: true, adminId: true, name: true, email: true }
    });

    if (!admin) {
      console.log('No admin found, creating test admin...');
      const testAdmin = await prisma.admin.create({
        data: {
          name: 'Test Admin',
          adminId: 'ADMIN001',
          email: 'test.admin@example.com',
          password: 'test123'
        },
        select: { id: true, adminId: true, name: true, email: true }
      });
      console.log('Created test admin:', testAdmin);
    } else {
      console.log('Found admin:', admin);
    }

    // Check if admin has corresponding employee record
    const adminEmployeeId = `ADMIN_${admin.adminId}`;
    let adminEmployee = await prisma.employee.findUnique({
      where: { employeeId: adminEmployeeId },
      select: { id: true, name: true, employeeId: true }
    });

    if (!adminEmployee) {
      console.log('Creating employee record for admin...');
      adminEmployee = await prisma.employee.create({
        data: {
          name: `${admin.name} (Admin)`,
          employeeId: adminEmployeeId,
          email: admin.email,
          password: 'N/A',
          role: 'IN_OFFICE',
          status: 'ACTIVE'
        },
        select: { id: true, name: true, employeeId: true }
      });
      console.log('Created admin employee record:', adminEmployee);
    } else {
      console.log('Admin employee record exists:', adminEmployee);
    }

    // Find any unassigned tickets
    const unassignedTickets = await prisma.supportTicket.findMany({
      where: { assigneeId: null },
      take: 1,
      select: { id: true, ticketId: true, description: true }
    });

    if (unassignedTickets.length > 0) {
      const ticket = unassignedTickets[0];
      console.log('Found unassigned ticket:', ticket);

      // Simulate admin accepting the ticket
      const updatedTicket = await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          assigneeId: adminEmployee.id,
          status: 'IN_PROGRESS'
        },
        include: {
          assignee: {
            select: { id: true, name: true, employeeId: true }
          }
        }
      });

      console.log('Ticket assigned to admin:', updatedTicket);
      console.log('✅ Admin ticket acceptance test successful!');
    } else {
      console.log('No unassigned tickets found for testing');
    }

  } catch (error) {
    console.error('Error during admin ticket acceptance test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminTicketAcceptance();