import { DocumentService } from './document.service';
import multer from 'multer';
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common document types
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/gif'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only PDF, Word, Excel, text, and image files are allowed.'));
        }
    }
});
export class DocumentController {
    documentService;
    constructor() {
        this.documentService = new DocumentService();
    }
    // Multer middleware
    uploadMiddleware = upload.single('file');
    // Upload document
    uploadDocument = async (req, res) => {
        try {
            const { employeeId, title, description, uploadedBy } = req.body;
            const file = req.file;
            // Validate required fields
            if (!employeeId || !title || !uploadedBy || !file) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: employeeId, title, uploadedBy, and file'
                });
            }
            const requestData = {
                employeeId,
                title: title.trim(),
                description: description?.trim(),
                file,
                uploadedBy
            };
            const result = await this.documentService.uploadDocument(requestData);
            if (result.success) {
                return res.status(201).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Error in uploadDocument:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };
    // Get employee documents
    getEmployeeDocuments = async (req, res) => {
        try {
            const { employeeId } = req.params;
            if (!employeeId) {
                return res.status(400).json({
                    success: false,
                    error: 'Employee ID is required'
                });
            }
            const result = await this.documentService.getEmployeeDocuments(employeeId);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(404).json(result);
            }
        }
        catch (error) {
            console.error('Error in getEmployeeDocuments:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };
    // Get all documents (admin)
    getAllDocuments = async (req, res) => {
        try {
            const result = await this.documentService.getAllDocuments();
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(500).json(result);
            }
        }
        catch (error) {
            console.error('Error in getAllDocuments:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };
    // Download document
    downloadDocument = async (req, res) => {
        try {
            const { documentId } = req.params;
            if (!documentId) {
                return res.status(400).json({
                    success: false,
                    error: 'Document ID is required'
                });
            }
            const result = await this.documentService.downloadDocument(documentId);
            if (result.success && result.filePath && result.fileName) {
                return res.download(result.filePath, result.fileName);
            }
            else {
                return res.status(404).json({
                    success: false,
                    error: result.error || 'Document not found'
                });
            }
        }
        catch (error) {
            console.error('Error in downloadDocument:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };
    // Delete document (admin only)
    deleteDocument = async (req, res) => {
        try {
            const { documentId } = req.params;
            if (!documentId) {
                return res.status(400).json({
                    success: false,
                    error: 'Document ID is required'
                });
            }
            const result = await this.documentService.deleteDocument(documentId);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Error in deleteDocument:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };
}
