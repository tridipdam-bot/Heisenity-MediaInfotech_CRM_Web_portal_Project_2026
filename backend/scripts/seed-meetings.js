const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedMeetings() {
  try {
    console.log('🌱 Seeding meetings...');

    // First, let's check if we have any employees
    const employees = await prisma.employee.findMany({
      take: 5
    });

    if (employees.length === 0) {
      console.log('❌ No employees found. Please seed employees first.');
      return;
    }

    console.log(`✅ Found ${employees.length} employees`);

    // Create some sample meetings
    const meetings = [
      {
        title: 'Weekly Team Standup',
        description: 'Weekly team sync to discuss progress and blockers',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
        location: 'Conference Room A',
        meetingType: 'INTERNAL',
        priority: 'MEDIUM',
        organizerId: employees[0].id,
        agenda: '1. Sprint review\n2. Upcoming tasks\n3. Blockers discussion\n4. Next week planning'
      },
      {
        title: 'Client Project Review',
        description: 'Review project progress with client stakeholders',
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // + 1.5 hours
        meetingType: 'CLIENT',
        priority: 'HIGH',
        organizerId: employees[0].id,
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        agenda: '1. Project status update\n2. Demo of completed features\n3. Feedback collection\n4. Next milestones'
      },
      {
        title: 'Training Session: New Technologies',
        description: 'Training session on latest development tools and practices',
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // + 2 hours
        location: 'Training Room',
        meetingType: 'TRAINING',
        priority: 'MEDIUM',
        organizerId: employees[1]?.id || employees[0].id,
        agenda: '1. Introduction to new tools\n2. Hands-on practice\n3. Q&A session\n4. Implementation planning'
      }
    ];

    for (const meetingData of meetings) {
      const meeting = await prisma.meeting.create({
        data: {
          ...meetingData,
          attendees: {
            create: employees.slice(1, 4).map(emp => ({
              employeeId: emp.id,
              status: 'INVITED'
            }))
          }
        },
        include: {
          organizer: true,
          attendees: {
            include: {
              employee: true
            }
          }
        }
      });

      console.log(`✅ Created meeting: ${meeting.title}`);
    }

    console.log('🎉 Meetings seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding meetings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMeetings();