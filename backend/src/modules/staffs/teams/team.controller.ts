import { Request, Response } from 'express';
import { getAllTeams, getTeamById, createTeam, createTeamWithMembers, updateTeamMembers } from './team.service';

export const getTeams = async (req: Request, res: Response) => {
  try {
    const teams = await getAllTeams();
    
    return res.status(200).json({
      success: true,
      data: teams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch teams',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    const team = await getTeamById(id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch team',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createNewTeam = async (req: Request, res: Response) => {
  try {
    const { name, description, memberIds, teamLeaderId } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    // If memberIds are provided, create team with members
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      // Validate that teamLeaderId is in memberIds if provided
      if (teamLeaderId && !memberIds.includes(teamLeaderId)) {
        return res.status(400).json({
          success: false,
          message: 'Team leader must be one of the selected members'
        });
      }

      const team = await createTeamWithMembers(name, description || null, memberIds, teamLeaderId);
      
      return res.status(201).json({
        success: true,
        data: team,
        message: `Team created successfully with ${memberIds.length} member${memberIds.length !== 1 ? 's' : ''}`
      });
    } else {
      // Create empty team
      const team = await createTeam(name, description);
      
      return res.status(201).json({
        success: true,
        data: team,
        message: 'Team created successfully'
      });
    }
  } catch (error) {
    console.error('Error creating team:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create team',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { memberIds, teamLeaderId } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    if (!memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({
        success: false,
        message: 'Member IDs array is required'
      });
    }

    // Validate that teamLeaderId is in memberIds if provided
    if (teamLeaderId && memberIds.length > 0 && !memberIds.includes(teamLeaderId)) {
      return res.status(400).json({
        success: false,
        message: 'Team leader must be one of the selected members'
      });
    }

    const team = await updateTeamMembers(id, memberIds, teamLeaderId);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: team,
      message: `Team updated successfully with ${memberIds.length} member${memberIds.length !== 1 ? 's' : ''}`
    });
  } catch (error) {
    console.error('Error updating team:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update team',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
