import { Router } from 'express';
import { ticketController } from './ticket.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create a new ticket
router.post('/', ticketController.createTicket.bind(ticketController));

// Get all tickets (with optional filters)
router.get('/', ticketController.getTickets.bind(ticketController));

// Get my tickets (tickets created by logged-in user)
router.get('/my-tickets', ticketController.getMyTickets.bind(ticketController));

// Get ticket by ID
router.get('/:id', ticketController.getTicketById.bind(ticketController));

// Update ticket
router.put('/:id', ticketController.updateTicket.bind(ticketController));

// Delete ticket
router.delete('/:id', ticketController.deleteTicket.bind(ticketController));

// Add comment to ticket
router.post('/:id/comments', ticketController.addComment.bind(ticketController));

export default router;
