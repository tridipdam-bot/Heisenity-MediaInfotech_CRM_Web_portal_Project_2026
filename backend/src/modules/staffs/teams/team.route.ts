import { Router, Request, Response } from 'express';
import { getTeams, getTeam, createNewTeam, updateTeam } from './team.controller';

const router = Router();

// Get all teams with members
router.get('/', (req: Request, res: Response) => {
  return getTeams(req, res);
});

// Get a specific team by ID
router.get('/:id', (req: Request, res: Response) => {
  return getTeam(req, res);
});

// Create a new team
router.post('/', (req: Request, res: Response) => {
  return createNewTeam(req, res);
});

// Update team members
router.put('/:id/members', (req: Request, res: Response) => {
  return updateTeam(req, res);
});

export default router;
