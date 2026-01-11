import { SystemConfigService } from '../services/systemConfig.service';
export class SystemConfigController {
    static async getOfficeLocation(req, res) {
        try {
            const location = await SystemConfigService.getOfficeLocation();
            const coordinates = await SystemConfigService.getOfficeCoordinates();
            res.json({
                success: true,
                data: {
                    location,
                    coordinates
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
            const { location, latitude, longitude, radius = 100 } = req.body;
            if (!location || typeof location !== 'string' || location.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Location is required and must be a non-empty string'
                });
            }
            if (latitude !== undefined && longitude !== undefined) {
                // Validate coordinates
                const lat = parseFloat(latitude);
                const lng = parseFloat(longitude);
                const rad = parseInt(radius);
                if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid coordinates provided'
                    });
                }
                if (isNaN(rad) || rad < 10 || rad > 1000) {
                    return res.status(400).json({
                        success: false,
                        error: 'Radius must be between 10 and 1000 meters'
                    });
                }
                const success = await SystemConfigService.setOfficeCoordinates(location.trim(), lat, lng, rad);
                if (success) {
                    res.json({
                        success: true,
                        message: 'Office location and coordinates updated successfully'
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to update office location'
                    });
                }
            }
            else {
                // Just update location name without coordinates
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
