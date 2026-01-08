import { VehicleService } from './vehicle.service';
const vehicleService = new VehicleService();
export class VehicleController {
    // GET /vehicles - Get all vehicles
    async getAllVehicles(req, res) {
        try {
            const { status, assignedTo, type } = req.query;
            const filters = {};
            if (status)
                filters.status = status;
            if (assignedTo)
                filters.assignedTo = assignedTo;
            if (type)
                filters.type = type;
            const result = await vehicleService.getAllVehicles(filters);
            if (result.success) {
                res.json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Error in getAllVehicles:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    // GET /vehicles/:id - Get vehicle by ID
    async getVehicleById(req, res) {
        try {
            const { id } = req.params;
            const result = await vehicleService.getVehicleById(id);
            if (result.success) {
                res.json(result);
            }
            else {
                res.status(404).json(result);
            }
        }
        catch (error) {
            console.error('Error in getVehicleById:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    // POST /vehicles - Create new vehicle
    async createVehicle(req, res) {
        try {
            console.log('Creating vehicle with data:', req.body);
            const data = req.body;
            // Validate required fields
            if (!data.vehicleNumber || !data.make || !data.model || !data.type) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: vehicleNumber, make, model, type'
                });
            }
            const result = await vehicleService.createVehicle(data);
            console.log('Vehicle creation result:', result);
            if (result.success) {
                res.status(201).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Error in createVehicle:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    // POST /vehicles/:id/assign - Assign vehicle to employee
    async assignVehicle(req, res) {
        try {
            const { id } = req.params;
            const { employeeId } = req.body;
            const data = {
                vehicleId: id,
                employeeId
            };
            const result = await vehicleService.assignVehicle(data);
            if (result.success) {
                res.json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Error in assignVehicle:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    // POST /vehicles/:id/unassign - Unassign vehicle
    async unassignVehicle(req, res) {
        try {
            const { id } = req.params;
            const result = await vehicleService.unassignVehicle(id);
            if (result.success) {
                res.json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Error in unassignVehicle:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    // GET /vehicles/employee/:employeeId - Get employee's assigned vehicle
    async getEmployeeVehicle(req, res) {
        try {
            const { employeeId } = req.params;
            const result = await vehicleService.getEmployeeVehicle(employeeId);
            res.json(result);
        }
        catch (error) {
            console.error('Error in getEmployeeVehicle:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    // GET /petrol-bills - Get all petrol bills
    async getAllPetrolBills(req, res) {
        try {
            const { status, employeeId, vehicleId } = req.query;
            const filters = {};
            if (status)
                filters.status = status;
            if (employeeId)
                filters.employeeId = employeeId;
            if (vehicleId)
                filters.vehicleId = vehicleId;
            const result = await vehicleService.getAllPetrolBills(filters);
            if (result.success) {
                res.json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Error in getAllPetrolBills:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    // POST /petrol-bills - Create petrol bill
    async createPetrolBill(req, res) {
        try {
            // Get employee ID from session/token
            const employeeId = req.user?.employeeId || req.user?.id;
            if (!employeeId) {
                return res.status(401).json({
                    success: false,
                    error: 'Employee ID not found in session'
                });
            }
            const data = req.body;
            const result = await vehicleService.createPetrolBill(employeeId, data);
            if (result.success) {
                res.status(201).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Error in createPetrolBill:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    // POST /petrol-bills/:id/approve - Approve/Reject petrol bill
    async approvePetrolBill(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            // Get admin ID from session/token
            const adminId = req.user?.adminId || req.user?.id;
            if (!adminId) {
                return res.status(401).json({
                    success: false,
                    error: 'Admin ID not found in session'
                });
            }
            const data = {
                billId: id,
                status: status,
                adminId
            };
            const result = await vehicleService.approvePetrolBill(data);
            if (result.success) {
                res.json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Error in approvePetrolBill:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    // DELETE /vehicles/:id - Delete vehicle
    async deleteVehicle(req, res) {
        try {
            const { id } = req.params;
            const result = await vehicleService.deleteVehicle(id);
            if (result.success) {
                res.json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Error in deleteVehicle:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}
