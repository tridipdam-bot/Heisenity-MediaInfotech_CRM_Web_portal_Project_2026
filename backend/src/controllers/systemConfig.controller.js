import { SystemConfigService } from '../services/systemConfig.service';
export class SystemConfigController {
    static async getOfficeLocation(req, res) {
        try {
            const location = await SystemConfigService.getOfficeLocation();
            res.json({
                success: true,
                data: {
                    location
                }
            });
        }
        catch (error) {
            console.error('Error getting office location:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get office location'
            });
        }
    }
    static async setOfficeLocation(req, res) {
        try {
            const { location } = req.body;
            if (!location || typeof location !== 'string' || location.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Location is required and must be a non-empty string'
                });
            }
            const success = await SystemConfigService.setOfficeLocation(location.trim());
            if (success) {
                res.json({
                    success: true,
                    message: 'Office location updated successfully'
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to update office location'
                });
            }
        }
        catch (error) {
            console.error('Error setting office location:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update office location'
            });
        }
    }
    static async getAllConfigs(req, res) {
        try {
            const configs = await SystemConfigService.getAllConfigs();
            res.json({
                success: true,
                data: configs
            });
        }
        catch (error) {
            console.error('Error getting all configs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get system configurations'
            });
        }
    }
}
