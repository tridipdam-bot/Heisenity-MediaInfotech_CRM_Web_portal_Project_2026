import { Request, Response } from 'express';
import { createMeeting } from './meeting.service';
import { prisma } from '../../lib/prisma';
import { MeetingType, MeetingPriority } from '@prisma/client';

// Calendly webhook handler
export const handleCalendlyWebhook = async (req: Request, res: Response) => {
  try {
    console.log('Calendly webhook received:', JSON.stringify(req.body, null, 2));
    
    const { event, payload } = req.body;
    
    // Handle different Calendly events
    switch (event) {
      case 'invitee.created':
        await handleInviteeCreated(payload);
        break;
      case 'invitee.canceled':
        await handleInviteeCanceled(payload);
        break;
      default:
        console.log('Unhandled Calendly event:', event);
    }
    
    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Error processing Calendly webhook:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to process webhook' 
    });
  }
};

// Handle when someone books a meeting via Calendly
const handleInviteeCreated = async (payload: any) => {
  try {
    const { event, invitee } = payload;
    
    // Find organizer info
    const organizerInfo = await findOrganizerInfo(event.event_memberships?.[0]?.user_email);
    
    // Extract meeting details from Calendly payload
    const meetingData = {
      title: event.name || 'Calendly Meeting',
      description: `Meeting scheduled via Calendly\n\nInvitee: ${invitee.name}\nEmail: ${invitee.email}`,
      startTime: new Date(event.start_time),
      endTime: new Date(event.end_time),
      location: event.location?.location || 'Virtual Meeting',
      meetingType: determineeMeetingType(event.name, invitee),
      priority: MeetingPriority.MEDIUM,
      organizerAdminId: organizerInfo.adminId,
      organizerEmployeeId: organizerInfo.employeeId,
      meetingLink: event.location?.join_url || payload.event.location?.join_url,
      agenda: `Calendly Meeting Details:\n- Event: ${event.name}\n- Duration: ${event.duration} minutes`,
      notes: `Calendly Data:\n- Event UUID: ${event.uuid}\n- Invitee UUID: ${invitee.uuid}\n- Scheduled: ${invitee.created_at}`,
      customerId: undefined as string | undefined
    };

    // Find customer if exists
    const customer = await findCustomerByEmail(invitee.email);
    if (customer) {
      meetingData.customerId = customer.id;
      meetingData.meetingType = MeetingType.CLIENT;
    }

    // Create meeting in database
    const meeting = await createMeeting(meetingData);
    
    console.log('Meeting created from Calendly:', meeting.id);
    
    // Store Calendly-specific data
    await prisma.calendlyMeeting.create({
      data: {
        meetingId: meeting.id,
        calendlyEventUuid: event.uuid,
        calendlyInviteeUuid: invitee.uuid,
        inviteeName: invitee.name,
        inviteeEmail: invitee.email,
        inviteePhone: invitee.phone_number,
        eventName: event.name,
        eventDuration: event.duration,
        scheduledAt: new Date(invitee.created_at),
        calendlyEventUrl: event.uri,
        rescheduleUrl: invitee.reschedule_url,
        cancelUrl: invitee.cancel_url
      }
    });
    
  } catch (error) {
    console.error('Error handling invitee created:', error);
    throw error;
  }
};

// Handle when someone cancels a Calendly meeting
const handleInviteeCanceled = async (payload: any) => {
  try {
    const { invitee } = payload;
    
    // Find the meeting by Calendly invitee UUID
    const calendlyMeeting = await prisma.calendlyMeeting.findFirst({
      where: { calendlyInviteeUuid: invitee.uuid },
      include: { meeting: true }
    });
    
    if (calendlyMeeting) {
      // Update meeting status to cancelled
      await prisma.meeting.update({
        where: { id: calendlyMeeting.meetingId },
        data: { 
          status: 'CANCELLED',
          notes: `${calendlyMeeting.meeting.notes || ''}\n\nCancelled via Calendly on ${new Date().toISOString()}`
        }
      });
      
      console.log('Meeting cancelled from Calendly:', calendlyMeeting.meetingId);
    }
    
  } catch (error) {
    console.error('Error handling invitee canceled:', error);
    throw error;
  }
};

// Manual import from Calendly API
export const importCalendlyMeetings = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, calendlyApiToken } = req.body;
    
    // Use token from request or environment
    const apiToken = calendlyApiToken || process.env.CALENDLY_API_TOKEN;
    
    if (!apiToken) {
      return res.status(400).json({
        success: false,
        error: 'Calendly API token is required. Please provide it in the request body or set CALENDLY_API_TOKEN in environment variables.'
      });
    }

    // Set default date range if not provided (last 30 days)
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const defaultEndDate = new Date();
    
    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;

    console.log(`Importing Calendly meetings from ${start.toISOString()} to ${end.toISOString()}`);

    // First, get the current user to get their organization
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Calendly API error (user):', errorText);
      return res.status(400).json({
        success: false,
        error: `Calendly API error: ${userResponse.status} - ${errorText}`
      });
    }

    const userData = await userResponse.json();
    const organizationUri = userData.resource.current_organization;

    // Get scheduled events from Calendly API
    const eventsUrl = new URL('https://api.calendly.com/scheduled_events');
    eventsUrl.searchParams.append('organization', organizationUri);
    eventsUrl.searchParams.append('min_start_time', start.toISOString());
    eventsUrl.searchParams.append('max_start_time', end.toISOString());
    eventsUrl.searchParams.append('status', 'active');
    eventsUrl.searchParams.append('count', '100'); // Max per request

    const eventsResponse = await fetch(eventsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      console.error('Calendly API error (events):', errorText);
      return res.status(400).json({
        success: false,
        error: `Calendly API error: ${eventsResponse.status} - ${errorText}`
      });
    }

    const eventsData = await eventsResponse.json();
    const events = eventsData.collection || [];

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    console.log(`Found ${events.length} events to process`);

    for (const event of events) {
      try {
        // Check if we already have this event
        const existingCalendlyMeeting = await prisma.calendlyMeeting.findFirst({
          where: { calendlyEventUuid: event.uri.split('/').pop() }
        });

        if (existingCalendlyMeeting) {
          console.log(`Skipping existing event: ${event.name}`);
          skipped++;
          continue;
        }

        // Get invitees for this event
        const inviteesResponse = await fetch(`https://api.calendly.com/scheduled_events/${event.uri.split('/').pop()}/invitees`, {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!inviteesResponse.ok) {
          console.error(`Failed to get invitees for event ${event.name}`);
          errors++;
          continue;
        }

        const inviteesData = await inviteesResponse.json();
        const invitees = inviteesData.collection || [];

        // Process each invitee (usually just one for most events)
        for (const invitee of invitees) {
          try {
            // Find organizer info
            const organizerEmail = event.event_memberships?.[0]?.user_email || userData.resource.email;
            const organizerInfo = await findOrganizerInfo(organizerEmail);
            
            // Extract meeting details
            const meetingData = {
              title: event.name || 'Imported Calendly Meeting',
              description: `Meeting imported from Calendly\n\nInvitee: ${invitee.name}\nEmail: ${invitee.email}`,
              startTime: new Date(event.start_time),
              endTime: new Date(event.end_time),
              location: event.location?.location || 'Virtual Meeting',
              meetingType: determineeMeetingType(event.name, invitee),
              priority: MeetingPriority.MEDIUM,
              organizerAdminId: organizerInfo.adminId,
              organizerEmployeeId: organizerInfo.employeeId,
              meetingLink: event.location?.join_url,
              agenda: `Imported Calendly Meeting:\n- Event: ${event.name}\n- Duration: ${(new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60)} minutes`,
              notes: `Imported from Calendly\n- Event URI: ${event.uri}\n- Invitee URI: ${invitee.uri}\n- Status: ${event.status}`,
              customerId: undefined as string | undefined
            };

            // Find customer if exists
            const customer = await findCustomerByEmail(invitee.email);
            if (customer) {
              meetingData.customerId = customer.id;
              meetingData.meetingType = MeetingType.CLIENT;
            }

            // Create meeting in database
            const meeting = await createMeeting(meetingData);
            
            // Store Calendly-specific data
            await prisma.calendlyMeeting.create({
              data: {
                meetingId: meeting.id,
                calendlyEventUuid: event.uri.split('/').pop() || event.uri,
                calendlyInviteeUuid: invitee.uri.split('/').pop() || invitee.uri,
                inviteeName: invitee.name,
                inviteeEmail: invitee.email,
                inviteePhone: invitee.phone_number,
                eventName: event.name,
                eventDuration: Math.round((new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60)),
                scheduledAt: new Date(invitee.created_at),
                calendlyEventUrl: event.uri,
                rescheduleUrl: invitee.reschedule_url,
                cancelUrl: invitee.cancel_url,
                calendlyData: {
                  event: event,
                  invitee: invitee,
                  importedAt: new Date().toISOString()
                }
              }
            });

            console.log(`Imported meeting: ${event.name} with ${invitee.name}`);
            imported++;

          } catch (inviteeError) {
            console.error(`Error processing invitee ${invitee.name}:`, inviteeError);
            errors++;
          }
        }

      } catch (eventError) {
        console.error(`Error processing event ${event.name}:`, eventError);
        errors++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Calendly import completed`,
      data: {
        imported,
        skipped,
        errors,
        totalProcessed: events.length,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('Error importing Calendly meetings:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import meetings'
    });
  }
};

// Determine meeting type based on event name and invitee info
const determineeMeetingType = (eventName: string, invitee: any): MeetingType => {
  const name = eventName?.toLowerCase() || '';
  
  if (name.includes('client') || name.includes('customer')) return MeetingType.CLIENT;
  if (name.includes('vendor') || name.includes('supplier')) return MeetingType.VENDOR;
  if (name.includes('training') || name.includes('workshop')) return MeetingType.TRAINING;
  if (name.includes('review') || name.includes('evaluation')) return MeetingType.REVIEW;
  
  return MeetingType.OTHER;
};

// Find organizer info by email
const findOrganizerInfo = async (email: string): Promise<{adminId?: string, employeeId?: string}> => {
  if (!email) {
    // Default to first admin if no email provided
    const admin = await prisma.admin.findFirst();
    if (admin) return { adminId: admin.id };
    
    // Fallback to first employee
    const employee = await prisma.employee.findFirst();
    return { employeeId: employee?.id };
  }
  
  // Try to find employee by email first
  const employee = await prisma.employee.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  });
  
  if (employee) return { employeeId: employee.id };
  
  // Try to find admin by email
  const admin = await prisma.admin.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  });
  
  if (admin) return { adminId: admin.id };
  
  // Default fallback to first admin
  const defaultAdmin = await prisma.admin.findFirst();
  if (defaultAdmin) return { adminId: defaultAdmin.id };
  
  // Final fallback to first employee
  const defaultEmployee = await prisma.employee.findFirst();
  return { employeeId: defaultEmployee?.id };
};

// Find customer by email
const findCustomerByEmail = async (email: string) => {
  if (!email) return null;
  
  return await prisma.customer.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  });
};