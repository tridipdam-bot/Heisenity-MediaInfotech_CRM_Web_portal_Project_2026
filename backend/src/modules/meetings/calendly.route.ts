import { Router } from 'express';
import {
  handleCalendlyWebhook,
  importCalendlyMeetings
} from './calendly.controller';

const router = Router();

// Calendly webhook endpoint (public - no auth required)
router.post('/webhook', handleCalendlyWebhook);

// Manual import from Calendly API
router.post('/import', importCalendlyMeetings);

export default router;