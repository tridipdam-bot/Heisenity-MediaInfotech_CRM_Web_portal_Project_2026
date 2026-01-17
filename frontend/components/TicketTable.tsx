"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Ticket, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Clock,
  User,
  MessageSquare,
  Calendar,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  ArrowUpDown,
  Phone,
  Paperclip,
  FileText,
  Image
} from "lucide-react"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"

// Mock data for tickets with comprehensive information
const ticketData = [
  {
    id: "TKT-001",
    title: "Login Authentication Issues",
    description: "Users unable to login with correct credentials",
    category: "Authentication",
    priority: "high",
    status: "open",
    assignee: "Sarah Johnson",
    reporter: "Michael Chen",
    createdDate: "2024-12-28",
    updatedDate: "2024-12-28",
    dueDate: "2024-12-30",
    tags: ["urgent", "security"],
    comments: 5,
    estimatedHours: 8,
    department: "IT Support"
  },
  {
    id: "TKT-002",
    title: "Printer Not Working in Office 3A",
    description: "HP LaserJet printer showing offline status",
    category: "Hardware",
    priority: "medium",
    status: "in_progress",
    assignee: "David Wilson",
    reporter: "Emily Rodriguez",
    createdDate: "2024-12-27",
    updatedDate: "2024-12-28",
    dueDate: "2024-12-29",
    tags: ["hardware", "office"],
    comments: 3,
    estimatedHours: 4,
    department: "Facilities"
  },
  {
    id: "TKT-003",
    title: "Software License Renewal Request",
    description: "Adobe Creative Suite licenses expiring next month",
    category: "Software",
    priority: "low",
    status: "pending",
    assignee: "Lisa Wang",
    reporter: "James Thompson",
    createdDate: "2024-12-26",
    updatedDate: "2024-12-27",
    dueDate: "2025-01-15",
    tags: ["license", "software"],
    comments: 2,
    estimatedHours: 2,
    department: "Procurement"
  },
  {
    id: "TKT-004",
    title: "Network Connectivity Issues",
    description: "Intermittent internet connection in Building B",
    category: "Network",
    priority: "high",
    status: "open",
    assignee: "Robert Martinez",
    reporter: "Anna Kowalski",
    createdDate: "2024-12-28",
    updatedDate: "2024-12-28",
    dueDate: "2024-12-29",
    tags: ["network", "urgent"],
    comments: 7,
    estimatedHours: 12,
    department: "IT Infrastructure"
  },
  {
    id: "TKT-005",
    title: "Email Server Maintenance",
    description: "Scheduled maintenance for email server upgrade",
    category: "Maintenance",
    priority: "medium",
    status: "scheduled",
    assignee: "Sarah Johnson",
    reporter: "System Admin",
    createdDate: "2024-12-25",
    updatedDate: "2024-12-27",
    dueDate: "2024-12-31",
    tags: ["maintenance", "email"],
    comments: 1,
    estimatedHours: 6,
    department: "IT Support"
  },
  {
    id: "TKT-006",
    title: "New Employee Laptop Setup",
    description: "Configure laptop and software for new hire",
    category: "Setup",
    priority: "medium",
    status: "in_progress",
    assignee: "David Wilson",
    reporter: "HR Department",
    createdDate: "2024-12-27",
    updatedDate: "2024-12-28",
    dueDate: "2024-12-30",
    tags: ["setup", "onboarding"],
    comments: 4,
    estimatedHours: 3,
    department: "IT Support"
  },
  {
    id: "TKT-007",
    title: "Database Performance Optimization",
    description: "Slow query performance affecting application",
    category: "Database",
    priority: "high",
    status: "resolved",
    assignee: "Robert Martinez",
    reporter: "Development Team",
    createdDate: "2024-12-20",
    updatedDate: "2024-12-26",
    dueDate: "2024-12-25",
    tags: ["database", "performance"],
    comments: 12,
    estimatedHours: 16,
    department: "IT Infrastructure"
  },
  {
    id: "TKT-008",
    title: "Security Camera Malfunction",
    description: "Camera 15 in parking lot not recording",
    category: "Security",
    priority: "medium",
    status: "closed",
    assignee: "Lisa Wang",
    reporter: "Security Team",
    createdDate: "2024-12-22",
    updatedDate: "2024-12-24",
    dueDate: "2024-12-26",
    tags: ["security", "hardware"],
    comments: 6,
    estimatedHours: 5,
    department: "Security"
  }
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case "OPEN":
    case "open":
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    case "IN_PROGRESS":
    case "in_progress":
      return <Clock className="h-4 w-4 text-blue-600" />
    case "PENDING":
    case "pending":
      return <Clock className="h-4 w-4 text-amber-600" />
    case "SCHEDULED":
    case "scheduled":
      return <Calendar className="h-4 w-4 text-purple-600" />
    case "RESOLVED":
    case "resolved":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "CLOSED":
    case "closed":
      return <XCircle className="h-4 w-4 text-gray-600" />
    default:
      return <Ticket className="h-4 w-4 text-gray-400" />
  }
}

const getStatusBadge = (status: string) => {
  const statusUpper = status.toUpperCase()
  const variants: Record<string, string> = {
    OPEN: "bg-red-50 text-red-700 border-red-200",
    IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    SCHEDULED: "bg-purple-50 text-purple-700 border-purple-200",
    RESOLVED: "bg-green-50 text-green-700 border-green-200",
    CLOSED: "bg-muted text-muted-foreground border-border",
    CANCELLED: "bg-gray-50 text-gray-700 border-gray-200"
  }
  
  const labels: Record<string, string> = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    PENDING: "Pending",
    SCHEDULED: "Scheduled",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
    CANCELLED: "Cancelled"
  }
  
  return (
    <Badge className={`${variants[statusUpper] || variants.OPEN} font-medium capitalize`}>
      {labels[statusUpper] || status}
    </Badge>
  )
}

const getPriorityBadge = (priority: string) => {
  const priorityUpper = priority.toUpperCase()
  const variants: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-800 border-red-300",
    HIGH: "bg-orange-50 text-orange-700 border-orange-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    LOW: "bg-green-50 text-green-700 border-green-200"
  }
  
  return (
    <Badge className={`${variants[priorityUpper] || variants.MEDIUM} font-medium capitalize`}>
      {priority}
    </Badge>
  )
}

export function TicketTable() {
  const router = useRouter()
  const { authenticatedFetch, isAuthenticated } = useAuthenticatedFetch()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [selectedStatus, setSelectedStatus] = React.useState("all")
  const [selectedPriority, setSelectedPriority] = React.useState("all")
  const [activeTab, setActiveTab] = React.useState("all")
  const [tickets, setTickets] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      // Static files are served from root, not /api/v1
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api/v1', '') || 'http://localhost:3001'
      const staticUrl = `${baseUrl}${filePath}`
      console.log('Direct download URL:', staticUrl)
      
      // Create a temporary link to download the file with the correct name
      const response = await fetch(staticUrl)
      if (!response.ok) {
        throw new Error('File not found')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading file:', error)
      // Final fallback - just open the file in a new tab
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api/v1', '') || 'http://localhost:3001'
      const staticUrl = `${baseUrl}${filePath}`
      window.open(staticUrl, '_blank')
    }
  }

  const fetchTickets = React.useCallback(async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tickets`)

      const result = await response.json()

      if (result.success) {
        setTickets(result.data)
      } else {
        console.error('Failed to fetch tickets:', result)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch])

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchTickets()
    }
    
    // Removed auto-refresh to prevent page reloading
    // Users can manually refresh using the Refresh button
  }, [isAuthenticated, fetchTickets])

  // Calculate summary statistics
  const totalTickets = tickets.length
  const openTickets = tickets.filter(ticket => ticket.status === "OPEN").length
  const inProgressTickets = tickets.filter(ticket => ticket.status === "IN_PROGRESS").length
  const resolvedTickets = tickets.filter(ticket => ticket.status === "RESOLVED").length
  const closedTickets = tickets.filter(ticket => ticket.status === "CLOSED").length
  const highPriorityTickets = tickets.filter(ticket => ticket.priority === "HIGH" || ticket.priority === "CRITICAL").length

  // Filter data based on search and filters
  const filteredData = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (ticket.assignee?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (ticket.reporter?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || ticket.category === selectedCategory
    const matchesStatus = selectedStatus === "all" || ticket.status === selectedStatus
    const matchesPriority = selectedPriority === "all" || ticket.priority === selectedPriority
    const matchesTab = activeTab === "all" || 
                      (activeTab === "open" && ["OPEN", "IN_PROGRESS", "PENDING", "SCHEDULED"].includes(ticket.status)) ||
                      (activeTab === "resolved" && ticket.status === "RESOLVED") ||
                      (activeTab === "closed" && ticket.status === "CLOSED")
    
    return matchesSearch && matchesCategory && matchesStatus && matchesPriority && matchesTab
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tickets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8 space-y-8">
        {/* Header Section */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground">Support Tickets</h1>
              <p className="text-muted-foreground">Manage and track customer support requests and issues</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={fetchTickets}
                disabled={loading}
                className="border-border hover:bg-accent"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
              <Button variant="outline" className="border-border hover:bg-accent">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button 
                onClick={() => router.push('/tickets/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted">
              <TabsTrigger value="all" className="data-[state=active]:bg-background">
                All Tickets ({totalTickets})
              </TabsTrigger>
              <TabsTrigger value="open" className="data-[state=active]:bg-background">
                Active ({openTickets + inProgressTickets})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="data-[state=active]:bg-background">
                Resolved ({resolvedTickets})
              </TabsTrigger>
              <TabsTrigger value="closed" className="data-[state=active]:bg-background">
                Closed ({closedTickets})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card shadow-sm border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Open Tickets</CardTitle>
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{openTickets}</span>
                </div>
                <p className="text-sm text-muted-foreground">need attention</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">In Progress</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{inProgressTickets}</span>
                </div>
                <p className="text-sm text-muted-foreground">being worked on</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">High Priority</CardTitle>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <ArrowUpDown className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{highPriorityTickets}</span>
                </div>
                <p className="text-sm text-muted-foreground">urgent tickets</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Resolved Today</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">5</span>
                </div>
                <p className="text-sm text-muted-foreground">tickets completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets, assignees, or reporters..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-border focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-border hover:bg-accent">
                      <Filter className="h-4 w-4 mr-2" />
                      Category
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setSelectedCategory("all")}>All Categories</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("AUTHENTICATION")}>Authentication</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("HARDWARE")}>Hardware</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("SOFTWARE")}>Software</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("NETWORK")}>Network</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("SECURITY")}>Security</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("DATABASE")}>Database</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("MAINTENANCE")}>Maintenance</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("SETUP")}>Setup</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-border hover:bg-accent">
                      <Filter className="h-4 w-4 mr-2" />
                      Priority
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setSelectedPriority("all")}>All Priorities</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority("CRITICAL")}>Critical Priority</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority("HIGH")}>High Priority</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority("MEDIUM")}>Medium Priority</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority("LOW")}>Low Priority</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card className="bg-card shadow-sm border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b border-border">
                <TableHead className="w-[280px] py-4 px-6 font-semibold text-foreground">Ticket Details</TableHead>
                <TableHead className="w-[180px] py-4 px-6 font-semibold text-foreground">Customer Info</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-foreground">Status</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-foreground">Priority</TableHead>
                <TableHead className="w-[150px] py-4 px-6 font-semibold text-foreground">Created By</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-foreground">Attachments</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-foreground">Due Date</TableHead>
                <TableHead className="py-4 px-6 font-semibold text-foreground">Department</TableHead>
                <TableHead className="w-[60px] py-4 px-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                      Loading tickets...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <Ticket className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Tickets Found</h3>
                      <p className="text-gray-600 mb-4">
                        {tickets.length === 0 
                          ? "No tickets have been created yet." 
                          : "No tickets match your current filters."
                        }
                      </p>
                      {tickets.length === 0 && (
                        <Button 
                          onClick={() => router.push('/tickets/new')}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Ticket
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((ticket, index) => (
                  <TableRow 
                    key={ticket.id} 
                    className={`hover:bg-accent/50 border-b border-border ${
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                    }`}
                  >
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            <Ticket className="h-6 w-6" />
                          </div>
                          {getStatusIcon(ticket.status) && (
                            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                              {getStatusIcon(ticket.status)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{ticket.title}</p>
                          <p className="text-sm text-muted-foreground">{ticket.ticketId} • {ticket.category}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{ticket.description}</p>
                          {ticket._count && ticket._count.comments > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <MessageSquare className="h-3 w-3 text-blue-600" />
                              <span className="text-xs text-blue-600">{ticket._count.comments} comments</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {ticket.customerName ? (
                        <div className="space-y-1">
                          <p className="font-medium text-foreground text-sm">{ticket.customerName}</p>
                          <p className="text-xs text-muted-foreground">{ticket.customerId}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {ticket.customerPhone}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {getStatusBadge(ticket.status)}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {getPriorityBadge(ticket.priority)}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {ticket.reporter ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                            {ticket.reporter.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{ticket.reporter.name}</p>
                            <p className="text-xs text-muted-foreground">{ticket.reporter.employeeId}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {ticket.attachments && ticket.attachments.length > 0 ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-blue-50">
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-600">{ticket.attachments.length}</span>
                                <div className="flex items-center gap-1">
                                  {ticket.attachments.slice(0, 2).map((attachment: any, index: number) => {
                                    const isImage = attachment.mimeType?.startsWith('image/') || 
                                                  attachment.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                    return (
                                      <div
                                        key={index}
                                        className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center"
                                      >
                                        {isImage ? (
                                          <Image className="h-2.5 w-2.5 text-blue-600" />
                                        ) : (
                                          <FileText className="h-2.5 w-2.5 text-blue-600" />
                                        )}
                                      </div>
                                    )
                                  })}
                                  {ticket.attachments.length > 2 && (
                                    <span className="text-xs text-blue-600">+{ticket.attachments.length - 2}</span>
                                  )}
                                </div>
                              </div>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-64">
                            <div className="px-2 py-1.5 text-sm font-semibold text-foreground border-b">
                              Attachments ({ticket.attachments.length})
                            </div>
                            {ticket.attachments.map((attachment: any, index: number) => {
                              const isImage = attachment.mimeType?.startsWith('image/') || 
                                            attachment.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                              const fileSize = attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'
                              
                              return (
                                <DropdownMenuItem key={index} className="flex items-center gap-3 py-2">
                                  <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center flex-shrink-0">
                                    {isImage ? (
                                      <Image className="h-4 w-4 text-blue-600" />
                                    ) : (
                                      <FileText className="h-4 w-4 text-blue-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate" title={attachment.fileName}>
                                      {attachment.fileName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {fileSize} • {attachment.mimeType || 'Unknown type'}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      downloadFile(attachment.filePath, attachment.fileName)
                                    }}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuItem>
                              )
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="text-sm">
                        <p className="font-medium text-foreground">
                          {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : 'No due date'}
                        </p>
                        {ticket.estimatedHours && (
                          <p className="text-xs text-muted-foreground">{ticket.estimatedHours}h estimated</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <span className="text-sm text-muted-foreground">{ticket.department}</span>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Ticket
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Assign Agent
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground bg-card rounded-lg p-4 border border-border">
          <div>
            Showing {filteredData.length} of {totalTickets} tickets
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="bg-blue-50 text-blue-600 border-blue-200">
                1
              </Button>
              <Button variant="outline" size="sm">
                2
              </Button>
              <Button variant="outline" size="sm">
                3
              </Button>
            </div>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}