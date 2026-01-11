import { prisma } from '../lib/prisma';
export class SystemConfigService {
    static async getConfig(key) {
        try {
            const config = await prisma.systemConfiguration.findUnique({
                where: { key }
            });
            return config?.value || null;
        }
        catch (error) {
            console.error('Error getting system config:', error);
            return null;
        }
    }
    static async setConfig(key, value) {
        try {
            await prisma.systemConfiguration.upsert({
                where: { key },
                update: { value, updatedAt: new Date() },
                create: { key, value }
            });
            return true;
        }
        catch (error) {
            console.error('Error setting system config:', error);
            return false;
        }
    }
    static async getOfficeLocation() {
        const location = await this.getConfig('office_location');
        return location || 'Main Office';
    }
    static async setOfficeLocation(location) {
        return await this.setConfig('office_location', location);
    }
    static async getAllConfigs() {
        try {
            const configs = await prisma.systemConfiguration.findMany();
            return configs.reduce((acc, config) => {
                acc[config.key] = config.value;
                return acc;
            }, {});
        }
        catch (error) {
            console.error('Error getting all configs:', error);
            return {};
        }
    }
}
