"use client"

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/hooks/use-toast'
import { Upload, FileText, X } from 'lucide-react'

interface TenderDocumentUploadProps {
  tenderId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const DOCUMENT_TYPES = [
  { value: 'TECHNICAL_SPECIFICATION', label: 'Technical Specification' },
  { value: 'FINANCIAL_PROPOSAL', label: 'Financial Proposal' },
  { value: 'COMPANY_PROFILE', label: 'Company Profile' },
  { value: 'COMPLIANCE_CERTIFICATE', label: 'Compliance Certificate' },
  { value: 'EMD_PROOF', label: 'EMD Proof' },
  { value: 'TENDER_FORM', label: 'Tender Form' },
  { value: 'OTHER', label: 'Other' }
]

export default function TenderDocumentUpload({ tenderId, isOpen, onClose, onSuccess }: TenderDocumentUploadProps) {
  const { data: session } = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png']
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'))
      
      if (!allowedTypes.includes(fileExtension)) {
        toast({
          title: "Invalid File Type",
          description: "Only PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG files are allowed",
          variant: "destructive"
        })
        return
      }

      // Validate file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 10MB",
          variant: "destructive"
        })
        return
      }

      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file || !documentType) {
      toast({
        title: "Missing Information",
        description: "Please select a file and document type",
        variant: "destructive"
      })
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('document', file)
      formData.append('documentType', documentType)
      formData.append('isRequired', isRequired.toString())

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tenders/${tenderId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(session?.user as any)?.sessionToken}`
        },
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Document uploaded successfully"
        })
        onSuccess()
        handleClose()
      } else {
        toast({
          title: "Upload Failed",
          description: result.message || "Failed to upload document",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      toast({
        title: "Upload Failed",
        description: "Failed to upload document",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setDocumentType('')
    setIsRequired(false)
    onClose()
  }

  const removeFile = () => {
    setFile(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document for this tender
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Document File *</Label>
            {!file ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG (max 10MB)
                </p>
                <Input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  className="mt-2"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Required Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRequired"
              checked={isRequired}
              onCheckedChange={(checked) => setIsRequired(checked as boolean)}
            />
            <Label htmlFor="isRequired" className="text-sm">
              Mark as required document
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || !documentType || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}