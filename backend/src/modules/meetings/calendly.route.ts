import { Router } from 'express';
import {
  handleCalendlyWebhook,
  importCalendlyMeetings,
  getCalendlyMeetingDetails
} from './calendly.controller';

const router = Router();

// Calendly webhook endpoint (public - no auth required)
router.post('/webhook', handleCalendlyWebhook);

// Manual import from Calendly API
router.post('/import', importCalendlyMeetings);

// Get Calendly meeting details
router.get('/:meetingId/calendly-details', getCalendlyMeetingDetails);

export default router;