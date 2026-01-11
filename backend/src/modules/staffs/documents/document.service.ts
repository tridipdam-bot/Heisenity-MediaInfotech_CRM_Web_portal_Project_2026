import { prisma } from '@/lib/prisma'
import {
  EmployeeDocument,
  UploadDocumentRequest,
  DocumentResponse,
  DocumentsResponse
} from './document.types'
import fs from 'fs'
import path from 'path'

export class DocumentService {
  private uploadDir = path.join(process.cwd(), 'uploads', 'documents')

  constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true })
    }
  }

  // Upload document for employee
  async uploadDocument(data: UploadDocumentRequest): Promise<DocumentResponse> {
    try {
      // Find employee
      const employee = await prisma.employee.findUnique({
        where: { employeeId: data.employeeId }
      })

      if (!employee) {
        return { success: false, error: 'Employee not found' }
      }

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = path.extname(data.file.originalname)
      const fileName = `${data.employeeId}_${timestamp}${fileExtension}`
      const filePath = path.join(this.uploadDir, fileName)

      // Save file to disk
      fs.writeFileSync(filePath, data.file.buffer)

      // Save document record to database
      const document = await prisma.employeeDocument.create({
        data: {
          employeeId: employee.id,
          title: data.title,
          description: data.description,
          fileName: data.file.originalname,
          filePath: fileName, // Store relative path
          fileSize: data.file.size,
          mimeType: data.file.mimetype,
          uploadedBy: data.uploadedBy
        },
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          }
        }
      })

      const response: EmployeeDocument = {
        id: document.id,
        employeeId: data.employeeId,
        employeeName: document.employee.name,
        title: document.title,
        description: document.description || undefined,
        fileName: document.fileName,
        filePath: document.filePath,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        uploadedBy: document.uploadedBy,
        uploadedAt: document.uploadedAt.toISOString(),
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString()
      }

      return { success: true, data: response }
    } catch (error) {
      console.error('Error uploading document:', error)
      return { success: false, error: 'Failed to upload document' }
    }
  }

  // Get documents for an employee
  async getEmployeeDocuments(employeeId: string): Promise<DocumentsResponse> {
    try {
      const employee = await prisma.employee.findUnique({
        where: { employeeId }
      })

      if (!employee) {
        return { success: false, error: 'Employee not found' }
      }

      const documents = await prisma.employeeDocument.findMany({
        where: { employeeId: employee.id },
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          }
        },
        orderBy: { uploadedAt: 'desc' }
      })

      const response: EmployeeDocument[] = documents.map(doc => ({
        id: doc.id,
        employeeId: employeeId,
        employeeName: doc.employee.name,
        title: doc.title,
        description: doc.description || undefined,
        fileName: doc.fileName,
        filePath: doc.filePath,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        uploadedBy: doc.uploadedBy,
        uploadedAt: doc.uploadedAt.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString()
      }))

      return { success: true, data: response }
    } catch (error) {
      console.error('Error fetching employee documents:', error)
      return { success: false, error: 'Failed to fetch documents' }
    }
  }

  // Get all documents (for admin)
  async getAllDocuments(): Promise<DocumentsResponse> {
    try {
      const documents = await prisma.employeeDocument.findMany({
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          }
        },
        orderBy: { uploadedAt: 'desc' }
      })

      const response: EmployeeDocument[] = documents.map(doc => ({
        id: doc.id,
        employeeId: doc.employee.employeeId,
        employeeName: doc.employee.name,
        title: doc.title,
        description: doc.description || undefined,
        fileName: doc.fileName,
        filePath: doc.filePath,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        uploadedBy: doc.uploadedBy,
        uploadedAt: doc.uploadedAt.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString()
      }))

      return { success: true, data: response }
    } catch (error) {
      console.error('Error fetching all documents:', error)
      return { success: false, error: 'Failed to fetch documents' }
    }
  }

  // Download document
  async downloadDocument(documentId: string): Promise<{ success: boolean; filePath?: string; fileName?: string; error?: string }> {
    try {
      const document = await prisma.employeeDocument.findUnique({
        where: { id: documentId }
      })

      if (!document) {
        return { success: false, error: 'Document not found' }
      }

      const fullPath = path.join(this.uploadDir, document.filePath)

      if (!fs.existsSync(fullPath)) {
        return { success: false, error: 'File not found on disk' }
      }

      return {
        success: true,
        filePath: fullPath,
        fileName: document.fileName
      }
    } catch (error) {
      console.error('Error downloading document:', error)
      return { success: false, error: 'Failed to download document' }
    }
  }

  // Delete document
  async deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const document = await prisma.employeeDocument.findUnique({
        where: { id: documentId }
      })

      if (!document) {
        return { success: false, error: 'Document not found' }
      }

      // Delete file from disk
      const fullPath = path.join(this.uploadDir, document.filePath)
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
      }

      // Delete record from database
      await prisma.employeeDocument.delete({
        where: { id: documentId }
      })

      return { success: true }
    } catch (error) {
      console.error('Error deleting document:', error)
      return { success: false, error: 'Failed to delete document' }
    }
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}