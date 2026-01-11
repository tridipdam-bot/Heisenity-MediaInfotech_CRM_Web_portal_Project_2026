"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Edit, 
  Trash2, 
  FolderOpen, 
  Calendar, 
  User, 
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause
} from "lucide-react"

interface Project {
  id: string
  name: string
  clientName: string
  startDate: string
  status: 'ONGOING' | 'COMPLETED' | 'ON_HOLD'
  createdAt: string
  updates: ProjectUpdate[]
  payments: ProjectPayment[]
}

interface ProjectUpdate {
  id: string
  update: string
  issues?: string
  pendingTasks?: string
  workProgress?: string
  createdAt: string
}

interface ProjectPayment {
  id: string
  status: 'FULLY_PAID' | 'PARTIALLY_PAID' | 'FULL_DUE'
  amountPaid?: number
  amountDue?: number
  remarks?: string
  createdAt: string
}

export function ProjectManagement() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = React.useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false)

  // Form states
  const [projectForm, setProjectForm] = React.useState({
    name: '',
    clientName: '',
    startDate: '',
    status: 'ONGOING' as 'ONGOING' | 'COMPLETED' | 'ON_HOLD'
  })

  const [updateForm, setUpdateForm] = React.useState({
    update: '',
    issues: '',
    pendingTasks: '',
    workProgress: ''
  })

  const [paymentForm, setPaymentForm] = React.useState({
    status: 'FULL_DUE' as 'FULLY_PAID' | 'PARTIALLY_PAID' | 'FULL_DUE',
    amountPaid: '',
    amountDue: '',
    remarks: ''
  })

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects`)
      const result = await response.json()
      
      if (result.success) {
        setProjects(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchProjects()
  }, [])

  // Add project
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectForm)
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchProjects()
        setIsAddDialogOpen(false)
        setProjectForm({ name: '', clientName: '', startDate: '', status: 'ONGOING' })
      }
    } catch (error) {
      console.error('Error adding project:', error)
    }
  }

  // Update project
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProject) return
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectForm)
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchProjects()
        setIsEditDialogOpen(false)
        setSelectedProject(null)
      }
    } catch (error) {
      console.error('Error updating project:', error)
    }
  }

  // Add project update
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProject) return
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects/${selectedProject.id}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateForm)
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchProjects()
        setIsUpdateDialogOpen(false)
        setUpdateForm({ update: '', issues: '', pendingTasks: '', workProgress: '' })
      }
    } catch (error) {
      console.error('Error adding update:', error)
    }
  }

  // Add payment info
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProject) return
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects/${selectedProject.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentForm,
          amountPaid: paymentForm.amountPaid ? parseFloat(paymentForm.amountPaid) : null,
          amountDue: paymentForm.amountDue ? parseFloat(paymentForm.amountDue) : null
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchProjects()
        setIsPaymentDialogOpen(false)
        setPaymentForm({ status: 'FULL_DUE', amountPaid: '', amountDue: '', remarks: '' })
      }
    } catch (error) {
      console.error('Error adding payment:', error)
    }
  }

  // Delete project
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects/${projectId}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchProjects()
      }
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONGOING': return <Clock className="h-4 w-4 text-blue-600" />
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'ON_HOLD': return <Pause className="h-4 w-4 text-amber-600" />
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ONGOING': return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Ongoing</Badge>
      case 'COMPLETED': return <Badge className="bg-green-50 text-green-700 border-green-200">Completed</Badge>
      case 'ON_HOLD': return <Badge className="bg-amber-50 text-amber-700 border-amber-200">On Hold</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'FULLY_PAID': return <Badge className="bg-green-50 text-green-700 border-green-200">Fully Paid</Badge>
      case 'PARTIALLY_PAID': return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Partially Paid</Badge>
      case 'FULL_DUE': return <Badge className="bg-red-50 text-red-700 border-red-200">Full Due</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/30 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FolderOpen className="h-8 w-8 text-blue-600" />
              Project Management
            </h1>
            <p className="text-gray-600">Manage ongoing projects, updates, and payment status</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddProject} className="space-y-4">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={projectForm.clientName}
                    onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={projectForm.status} onValueChange={(value: any) => setProjectForm({ ...projectForm, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONGOING">Ongoing</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">Add Project</Button>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {getStatusIcon(project.status)}
                    {project.name}
                  </CardTitle>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      {project.clientName}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      {new Date(project.startDate).toLocaleDateString()}
                    </div>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProject(project)
                      setProjectForm({
                        name: project.name,
                        clientName: project.clientName,
                        startDate: project.startDate.split('T')[0],
                        status: project.status
                      })
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="updates" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="updates">Updates</TabsTrigger>
                  <TabsTrigger value="payment">Payment</TabsTrigger>
                </TabsList>
                
                <TabsContent value="updates" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Recent Updates</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProject(project)
                        setIsUpdateDialogOpen(true)
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {project.updates.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No updates yet</p>
                    ) : (
                      project.updates.slice(0, 2).map((update) => (
                        <div key={update.id} className="p-2 bg-gray-50 rounded text-sm">
                          <p className="text-gray-900">{update.update}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(update.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="payment" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Payment Status</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProject(project)
                        setIsPaymentDialogOpen(true)
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Update
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {project.payments.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No payment info</p>
                    ) : (
                      project.payments.slice(-1).map((payment) => (
                        <div key={payment.id} className="p-2 bg-gray-50 rounded">
                          <div className="flex items-center justify-between mb-2">
                            {getPaymentStatusBadge(payment.status)}
                          </div>
                          {(payment.amountPaid || payment.amountDue) && (
                            <div className="text-sm space-y-1">
                              {payment.amountPaid && (
                                <p className="text-green-600">Paid: ₹{payment.amountPaid}</p>
                              )}
                              {payment.amountDue && (
                                <p className="text-red-600">Due: ₹{payment.amountDue}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first project</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Project Name</Label>
              <Input
                id="edit-name"
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-clientName">Client Name</Label>
              <Input
                id="edit-clientName"
                value={projectForm.clientName}
                onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={projectForm.startDate}
                onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={projectForm.status} onValueChange={(value: any) => setProjectForm({ ...projectForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONGOING">Ongoing</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Update Project</Button>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Project Update</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUpdate} className="space-y-4">
            <div>
              <Label htmlFor="update">Latest Update</Label>
              <Textarea
                id="update"
                value={updateForm.update}
                onChange={(e) => setUpdateForm({ ...updateForm, update: e.target.value })}
                placeholder="Describe the latest progress..."
                required
              />
            </div>
            <div>
              <Label htmlFor="issues">Issues Faced</Label>
              <Textarea
                id="issues"
                value={updateForm.issues}
                onChange={(e) => setUpdateForm({ ...updateForm, issues: e.target.value })}
                placeholder="Any challenges or issues..."
              />
            </div>
            <div>
              <Label htmlFor="pendingTasks">Pending Tasks</Label>
              <Textarea
                id="pendingTasks"
                value={updateForm.pendingTasks}
                onChange={(e) => setUpdateForm({ ...updateForm, pendingTasks: e.target.value })}
                placeholder="Tasks that need to be completed..."
              />
            </div>
            <div>
              <Label htmlFor="workProgress">Work Progress Notes</Label>
              <Textarea
                id="workProgress"
                value={updateForm.workProgress}
                onChange={(e) => setUpdateForm({ ...updateForm, workProgress: e.target.value })}
                placeholder="Additional progress notes..."
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Add Update</Button>
              <Button type="button" variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Payment Information</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div>
              <Label htmlFor="payment-status">Payment Status</Label>
              <Select value={paymentForm.status} onValueChange={(value: any) => setPaymentForm({ ...paymentForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULLY_PAID">Fully Paid</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                  <SelectItem value="FULL_DUE">Full Due</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amountPaid">Amount Paid (₹)</Label>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                value={paymentForm.amountPaid}
                onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="amountDue">Amount Due (₹)</Label>
              <Input
                id="amountDue"
                type="number"
                step="0.01"
                value={paymentForm.amountDue}
                onChange={(e) => setPaymentForm({ ...paymentForm, amountDue: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="remarks">Payment Remarks</Label>
              <Textarea
                id="remarks"
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                placeholder="Additional payment notes..."
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Update Payment</Button>
              <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}