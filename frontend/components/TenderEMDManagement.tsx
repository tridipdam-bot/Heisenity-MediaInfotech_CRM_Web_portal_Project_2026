"use client"

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { DollarSign, Plus, Calendar, AlertCircle } from 'lucide-react'

interface EMDRecord {
  id: string
  amount: number
  status: string
  investedAt: string
  refundedAt?: string
  forfeitedAt?: string
  remarks?: string
}

interface TenderEMDManagementProps {
  tenderId: string
  emdRecords: EMDRecord[]
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const EMD_STATUSES = [
  { value: 'INVESTED', label: 'Invested', color: 'bg-blue-100 text-blue-800' },
  { value: 'REFUNDED', label: 'Refunded', color: 'bg-green-100 text-green-800' },
  { value: 'FORFEITED', label: 'Forfeited', color: 'bg-red-100 text-red-800' }
]

export default function TenderEMDManagement({ tenderId, emdRecords, isOpen, onClose, onSuccess }: TenderEMDManagementProps) {
  const { data: session } = useSession()
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    status: 'INVESTED',
    remarks: ''
  })
  const [loading, setLoading] = useState(false)

  const handleAddEMD = async () => {
    if (!formData.amount) {
      toast({
        title: "Missing Information",
        description: "Please enter the EMD amount",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tenders/${tenderId}/emd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session?.user as any)?.sessionToken}`
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          status: formData.status,
          remarks: formData.remarks || undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "EMD record added successfully"
        })
        setFormData({ amount: '', status: 'INVESTED', remarks: '' })
        setShowAddForm(false)
        onSuccess()
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to add EMD record",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error adding EMD record:', error)
      toast({
        title: "Error",
        description: "Failed to add EMD record",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEMDStatus = async (emdId: string, status: string, remarks?: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tenders/emd/${emdId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session?.user as any)?.sessionToken}`
        },
        body: JSON.stringify({ status, remarks })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "EMD status updated successfully"
        })
        onSuccess()
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update EMD status",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error updating EMD status:', error)
      toast({
        title: "Error",
        description: "Failed to update EMD status",
        variant: "destructive"
      })
    }
  }

  const getEMDStatusBadge = (status: string) => {
    const statusConfig = EMD_STATUSES.find(s => s.value === status)
    return (
      <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
        {statusConfig?.label || status}
      </Badge>
    )
  }

  const getTotalEMD = () => {
    return emdRecords.reduce((total, record) => total + record.amount, 0)
  }

  const getEMDByStatus = (status: string) => {
    return emdRecords
      .filter(record => record.status === status)
      .reduce((total, record) => total + record.amount, 0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>EMD Management</DialogTitle>
          <DialogDescription>
            Manage Earnest Money Deposit records for this tender
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* EMD Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Total EMD</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">₹{getTotalEMD().toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Invested</span>
              </div>
              <p className="text-xl font-bold text-blue-900">₹{getEMDByStatus('INVESTED').toLocaleString()}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Refunded</span>
              </div>
              <p className="text-xl font-bold text-green-900">₹{getEMDByStatus('REFUNDED').toLocaleString()}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-800">Forfeited</span>
              </div>
              <p className="text-xl font-bold text-red-900">₹{getEMDByStatus('FORFEITED').toLocaleString()}</p>
            </div>
          </div>

          {/* Add EMD Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">EMD Records</h3>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add EMD Record
            </Button>
          </div>

          {/* Add EMD Form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium mb-4">Add New EMD Record</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Enter EMD amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMD_STATUSES.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Enter remarks (optional)"
                    rows={1}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEMD} disabled={loading || !formData.amount}>
                  {loading ? 'Adding...' : 'Add EMD Record'}
                </Button>
              </div>
            </div>
          )}

          {/* EMD Records List */}
          <div className="space-y-3">
            {emdRecords.length > 0 ? (
              emdRecords.map((record) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-lg font-semibold">₹{record.amount.toLocaleString()}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>Invested: {new Date(record.investedAt).toLocaleDateString()}</span>
                        </div>
                        {record.refundedAt && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <Calendar className="h-4 w-4" />
                            <span>Refunded: {new Date(record.refundedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        {record.forfeitedAt && (
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <Calendar className="h-4 w-4" />
                            <span>Forfeited: {new Date(record.forfeitedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getEMDStatusBadge(record.status)}
                      {record.status === 'INVESTED' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateEMDStatus(record.id, 'REFUNDED')}
                            className="text-green-600 hover:text-green-700"
                          >
                            Refund
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateEMDStatus(record.id, 'FORFEITED')}
                            className="text-red-600 hover:text-red-700"
                          >
                            Forfeit
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {record.remarks && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-gray-400 mt-0.5" />
                        <p className="text-sm text-gray-600">{record.remarks}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No EMD records found</p>
                <p className="text-sm">Add an EMD record to get started</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}