import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export class CustomerSupportUploadController {
  // Configure multer for file uploads
  private storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../../uploads/customer-support');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, extension);
      cb(null, `${baseName}-${uniqueSuffix}${extension}`);
    }
  });

  private fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Allow common document and image formats
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and documents are allowed.'));
    }
  };

  public uploadMiddleware = multer({
    storage: this.storage,
    fileFilter: this.fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 5 // Maximum 5 files
    }
  }).array('documents', 5);

  // Upload files for customer support
  uploadFiles = async (req: Request, res: Response) => {
    try {
      const customerId = (req as any).customer?.id;
      
      if (!customerId) {
        return res.status(401).json({ error: 'Customer authentication required' });
      }

      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      // Process uploaded files
      const uploadedFiles = files.map(file => ({
        originalName: file.originalname,
        filename: file.filename,
        path: `/uploads/customer-support/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype
      }));

      res.json({
        success: true,
        message: 'Files uploaded successfully',
        files: uploadedFiles
      });
    } catch (error) {
      console.error('Error uploading customer support files:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  };

  // Download file
  downloadFile = async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../../../uploads/customer-support', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  };
}