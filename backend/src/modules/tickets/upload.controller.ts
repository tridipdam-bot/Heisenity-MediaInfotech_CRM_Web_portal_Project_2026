import { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

// Configure multer for ticket file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/tickets')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, text, and image files are allowed.'))
    }
  }
})

export class TicketUploadController {
  // Multer middleware
  uploadMiddleware = upload.single('file')

  // Upload single file for ticket
  uploadFile = async (req: Request, res: Response) => {
    try {
      console.log('Upload request received:', {
        file: req.file ? 'File present' : 'No file',
        body: req.body,
        headers: req.headers['content-type']
      })

      const file = req.file

      if (!file) {
        console.log('No file uploaded')
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        })
      }

      console.log('File uploaded successfully:', {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size
      })

      // Return file information
      const fileUrl = `/uploads/tickets/${file.filename}`
      
      return res.status(200).json({
        success: true,
        data: {
          url: fileUrl,
          path: fileUrl,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype
        }
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to upload file'
      })
    }
  }

  // Download file
  downloadFile = async (req: Request, res: Response) => {
    try {
      const { filename } = req.params
      const filePath = path.join(__dirname, '../../../uploads/tickets', filename)

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        })
      }

      return res.download(filePath)
    } catch (error) {
      console.error('Error downloading file:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to download file'
      })
    }
  }
}