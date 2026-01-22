"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Calendar, User } from "lucide-react"
import { showToast } from "@/lib/toast-utils"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"

interface EmployeeDocument {
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

interface EmployeeDocumentsProps {
  employeeId: string
}

export function EmployeeDocuments({ employeeId }: EmployeeDocumentsProps) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const { authenticatedFetch, isAuthenticated } = useAuthenticatedFetch()

  const fetchDocuments = async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/documents/employee/${employeeId}`)
      const result = await response.json()
      
      if (result.success) {
        setDocuments(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to fetch documents')
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      showToast.error('Failed to fetch documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [employeeId, isAuthenticated])

  const handleDownload = async (documentId: string, fileName: string) => {
    try {
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/documents/download/${documentId}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showToast.success('Document downloaded successfully')
      } else {
        throw new Error('Failed to download document')
      }
    } catch (error) {
      console.error('Error downloading document:', error)
      showToast.error('Failed to download document')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word')) return '📝'
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊'
    if (mimeType.includes('image')) return '🖼️'
    if (mimeType.includes('text')) return '📃'
    return '📁'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading documents...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-blue-500" />
          <span>My Documents</span>
        </CardTitle>
        <p className="text-gray-600">
          Documents shared with you by the admin
        </p>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents</h3>
            <p className="text-gray-600">
              No documents have been shared with you yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => (
              <div
                key={document.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{getFileTypeIcon(document.mimeType)}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">{document.title}</h4>
                        <p className="text-sm text-gray-500">{document.fileName}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {document.mimeType.split('/')[1].toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>Uploaded by: {document.uploadedBy}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(document.uploadedAt)}</span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      <span><strong>Size:</strong> {formatFileSize(document.fileSize)}</span>
                    </div>

                    {document.description && (
                      <div className="text-sm text-gray-700 mb-3 bg-gray-50 rounded p-3">
                        <span className="font-medium">Description:</span>
                        <p className="mt-1">{document.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <Button
                      onClick={() => handleDownload(document.id, document.fileName)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}