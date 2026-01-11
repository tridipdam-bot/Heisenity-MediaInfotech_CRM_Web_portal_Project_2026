export interface EmployeeDocument {
  id: string
  employeeId: string
  employeeName?: string
  title: string
  description?: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedAt: string
  createdAt: string
  updatedAt: string
}

export interface UploadDocumentRequest {
  employeeId: string
  title: string
  description?: string
  file: Express.Multer.File
  uploadedBy: string
}

export interface DocumentResponse {
  success: boolean
  data?: EmployeeDocument
  error?: string
}

export interface DocumentsResponse {
  success: boolean
  data?: EmployeeDocument[]
  error?: string
}