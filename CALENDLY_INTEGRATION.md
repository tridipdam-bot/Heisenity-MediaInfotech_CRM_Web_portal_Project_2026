# Calendly Integration for Company Records

## Overview
This integration automatically syncs Calendly meetings to your company database for complete record-keeping and compliance. All meetings scheduled through Calendly are stored in your internal system with full details.

## Features

### 🔄 **Automatic Sync**
- **Real-time Webhooks**: Meetings sync automatically when booked/cancelled
- **Complete Data Storage**: All meeting details stored in company database
- **Customer Matching**: Automatically links meetings to existing customers
- **Employee Assignment**: Maps meetings to correct organizers

### 📊 **Data Captured**
- **Meeting Details**: Title, description, date/time, duration
- **Participant Info**: Invitee name, email, phone number
- **Calendly Metadata**: Event UUID, reschedule/cancel URLs
- **Integration Data**: Sync timestamps, original Calendly payload
- **Company Context**: Links to customers, employees, projects

### 🎯 **Business Benefits**
- **Compliance**: Complete meeting records for audits
- **Analytics**: Track meeting patterns and customer engagement
- **CRM Integration**: Meetings appear in customer profiles
- **Team Coordination**: All meetings visible to relevant team members
- **Historical Records**: Permanent storage of all meeting data

## Setup Instructions

### 1. Configure Calendly Webhook

1. **Login to Calendly**
   - Go to your Calendly account settings
   - Navigate to "Integrations" → "Webhooks"

2. **Add Webhook URL**
   ```
   https://your-domain.com/api/v1/calendly/webhook
   ```

3. **Select Events**
   - ✅ Invitee Created (when someone books)
   - ✅ Invitee Canceled (when someone cancels)

4. **Save Configuration**
   - Test the webhook to ensure it's working
   - Check webhook logs for any errors

### 2. Environment Variables

Add to your `.env` file:
```env
# Calendly Integration
CALENDLY_WEBHOOK_SECRET=your-webhook-secret-key
CALENDLY_API_TOKEN=your-calendly-api-token
```

### 3. Database Migration

Run the migration to add Calendly tables:
```bash
cd backend
npx prisma migrate deploy
```

## How It Works

### Automatic Sync Process

1. **Customer Books Meeting**
   - Customer selects time slot on Calendly
   - Calendly sends webhook to your system
   - System creates meeting record in database

2. **Data Processing**
   - Extract meeting details from Calendly payload
   - Match customer email to existing customer records
   - Assign meeting to appropriate employee/organizer
   - Store complete meeting information

3. **Company Integration**
   - Meeting appears in company meeting dashboard
   - Customer profile shows meeting history
   - Team members can see relevant meetings
   - Meeting data available for reporting

### Data Flow Diagram

```
Calendly → Webhook → Your API → Database → Company Dashboard
    ↓
Customer Books
    ↓
Real-time Sync
    ↓
Complete Records
```

## API Endpoints

### Webhook Endpoint
```http
POST /api/v1/calendly/webhook
Content-Type: application/json

{
  "event": "invitee.created",
  "payload": {
    "event": { ... },
    "invitee": { ... }
  }
}
```

### Manual Import
```http
POST /api/v1/calendly/import
Content-Type: application/json

{
  "calendlyApiToken": "your-token",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

### Get Meeting Details
```http
GET /api/v1/calendly/{meetingId}/calendly-details
```

## Database Schema

### CalendlyMeeting Table
```sql
CREATE TABLE calendly_meetings (
  id                    TEXT PRIMARY KEY,
  meeting_id            TEXT UNIQUE NOT NULL,
  calendly_event_uuid   TEXT UNIQUE NOT NULL,
  calendly_invitee_uuid TEXT UNIQUE NOT NULL,
  invitee_name          TEXT NOT NULL,
  invitee_email         TEXT NOT NULL,
  invitee_phone         TEXT,
  event_name            TEXT NOT NULL,
  event_duration        INTEGER NOT NULL,
  scheduled_at          TIMESTAMP NOT NULL,
  calendly_event_url    TEXT,
  reschedule_url        TEXT,
  cancel_url            TEXT,
  calendly_data         JSONB,
  synced_at             TIMESTAMP DEFAULT NOW(),
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);
```

## Frontend Features

### Calendly Sync Dashboard
- **Integration Status**: Shows webhook configuration status
- **Synced Meetings**: List of all Calendly meetings in system
- **Manual Import**: Import historical meetings
- **Setup Instructions**: Step-by-step webhook setup guide

### Meeting Management
- **Calendly Badge**: Meetings show Calendly origin
- **Rich Details**: Full Calendly metadata available
- **Customer Linking**: Automatic customer association
- **Reschedule Links**: Direct links to Calendly reschedule

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Data**
   - Check webhook URL is correct
   - Verify webhook secret matches
   - Check firewall/security settings
   - Test webhook manually

2. **Meetings Not Creating**
   - Check employee email matching
   - Verify customer email format
   - Review error logs
   - Check database permissions

3. **Customer Not Linking**
   - Ensure customer email exists in system
   - Check email case sensitivity
   - Verify customer status is active
   - Review customer matching logic

### Debug Mode

Enable debug logging:
```env
CALENDLY_DEBUG=true
```

Check logs for detailed webhook processing information.

## Security Considerations

### Data Protection
- **Webhook Security**: Verify webhook signatures
- **Data Encryption**: Sensitive data encrypted at rest
- **Access Control**: Role-based access to meeting data
- **Audit Trail**: Complete audit log of all changes

### Privacy Compliance
- **GDPR Compliance**: Customer data handling compliant
- **Data Retention**: Configurable data retention policies
- **Consent Management**: Respect customer privacy preferences
- **Data Export**: Customer data export capabilities

## Reporting & Analytics

### Available Reports
- **Meeting Volume**: Track meeting frequency over time
- **Customer Engagement**: Customer meeting patterns
- **Employee Utilization**: Meeting load per employee
- **Conversion Tracking**: Meeting to customer conversion

### Export Options
- **Excel Export**: Meeting data with Calendly details
- **CSV Export**: Raw data for external analysis
- **API Access**: Programmatic access to meeting data
- **Dashboard Widgets**: Real-time meeting metrics

## Future Enhancements

### Planned Features
- **Two-way Sync**: Update Calendly from company system
- **Advanced Matching**: Better customer/employee matching
- **Meeting Templates**: Pre-configured meeting types
- **Automated Follow-up**: Post-meeting task creation
- **Integration APIs**: Connect with other business tools

### Customization Options
- **Custom Fields**: Map additional Calendly fields
- **Business Rules**: Custom meeting processing logic
- **Notification System**: Custom meeting notifications
- **Workflow Integration**: Connect to existing workflows

## Support

For technical support or questions about the Calendly integration:

1. **Check Documentation**: Review this guide and API docs
2. **Review Logs**: Check application and webhook logs
3. **Test Webhook**: Use Calendly's webhook testing tools
4. **Contact Support**: Reach out to development team

## Compliance Notes

This integration helps maintain complete meeting records for:
- **Business Audits**: Complete meeting history
- **Customer Service**: Full interaction timeline
- **Legal Compliance**: Meeting documentation requirements
- **Quality Assurance**: Service delivery tracking

All meeting data is stored securely and can be exported for compliance purposes.