"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Clock,
  MapPin,
  User,
  Calendar,
  AlertCircle,
  LogOut,
  FileText,
  Car,
  Upload,
  QrCode,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  Menu,
  X
} from "lucide-react"
import { EmployeeSelfAttendance } from "./EmployeeSelfAttendance"
import { LeaveApplicationForm } from "./LeaveApplicationForm"
import { LeaveApplicationsList } from "./LeaveApplicationsList"
import { EmployeeDocuments } from "./EmployeeDocuments"
import { StaffTicketForm } from "./StaffTicketForm"
import { StaffTicketList } from "./StaffTicketList"
import { TaskCheckInOut } from "@/components/TaskCheckInOut"
import BarcodeScanner from "@/components/barcodeScanner/BarcodeScanner"
import { StaffFeatureAccessManagement } from "./StaffFeatureAccessManagement"
import { getMyFeatures, type StaffPortalFeature } from "@/lib/server-api"
import { dayClockOut } from "@/lib/server-api"
import { showToast, showConfirm } from "@/lib/toast-utils"
import { playNotificationSound } from "@/lib/notification-sound"


interface EmployeeProfile {
  id: string
  name: string
  employeeId: string
  email: string
  phone?: string
  teamId?: string
  team?: {
    id: string
    name: string
  }
  isTeamLeader: boolean
  status: string
  role?: string
}

interface AssignedVehicle {
  id: string
  vehicleNumber: string
  make: string
  model: string
  type: string
  assignedAt: string
}

export function StaffPortal() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null)
  const [assignedVehicle, setAssignedVehicle] = useState<AssignedVehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave' | 'documents' | 'vehicle' | 'tasks' | 'dashboard' | 'project' | 'task_management' | 'support_requests' | 'customers' | 'employees' | 'teams' | 'admin_ticket_management' | 'tenders' | 'stock' | 'hr_center' | 'field_engineer_attendance' | 'inoffice_attendance' | 'customer_support_requests' | 'staff_feature_access' | 'tickets'>('attendance')
  const [leaveRefreshTrigger, setLeaveRefreshTrigger] = useState(0)
  const [ticketRefreshTrigger, setTicketRefreshTrigger] = useState(0)
  const [dayClockOutLoading, setDayClockOutLoading] = useState(false)
  const [pendingSupportRequests, setPendingSupportRequests] = useState(0)
  const [allowedFeatures, setAllowedFeatures] = useState<StaffPortalFeature[]>([])
  const [lastScannedProduct, setLastScannedProduct] = useState<string | null>(null)
  const [showTransactionHistory, setShowTransactionHistory] = useState(false)
  const [transactionHistory, setTransactionHistory] = useState<any[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  // UI state: responsive sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (status === "loading") return

    if (!session || (session.user as { userType?: string })?.userType !== "EMPLOYEE") {
      router.push("/")
      return
    }

    fetchEmployeeProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router])

  // Fetch features after profile is loaded
  useEffect(() => {
    if (employeeProfile) {
      fetchAllowedFeatures()
      // Fetch support requests if IN_OFFICE employee
      if (employeeProfile.role === 'IN_OFFICE') {
        fetchPendingSupportRequests()
        // Poll every 30 seconds for new support requests
        const interval = setInterval(fetchPendingSupportRequests, 30000)
        return () => clearInterval(interval)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeProfile])

  const fetchAllowedFeatures = async () => {
    try {
      // Only fetch features for IN_OFFICE employees
      if (employeeProfile?.role !== 'IN_OFFICE') {
        setAllowedFeatures([])
        return
      }

      const response = await getMyFeatures()

      if (response.success && response.data) {
        setAllowedFeatures(response.data.allowedFeatures)
      } else {
        // If no features are set, default to empty array
        setAllowedFeatures([])
      }
    } catch (error) {
      console.error('Error fetching allowed features:', error)
      setAllowedFeatures([])
    }
  }

  const hasFeatureAccess = (feature: StaffPortalFeature): boolean => {
    // Field engineers have no access to staff features by default
    if (employeeProfile?.role === 'FIELD_ENGINEER') {
      const fieldEngineerBuiltInFeatures = ['VEHICLE']
      return fieldEngineerBuiltInFeatures.includes(feature)
    }
    // IN_OFFICE employees need explicit feature access
    return allowedFeatures.includes(feature)
  }

  const fetchEmployeeProfile = async () => {
    try {
      if (!session?.user) return

      const employeeId = (session.user as { employeeId?: string })?.employeeId
      if (!employeeId) return

      // Try to fetch from employees endpoint first (works for both field engineers and in-office)
      let profileResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employees/by-employee-id/${employeeId}`)

      // If that fails, try field-engineers endpoint (for backward compatibility)
      if (!profileResponse.ok) {
        profileResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/field-engineers/${employeeId}`)
      }

      // Fetch assigned vehicle (only for field engineers)
      if (profileResponse.ok) {
        const result = await profileResponse.json()
        if (result.success && result.data) {
          setEmployeeProfile({
            id: result.data.id,
            name: result.data.name,
            employeeId: result.data.employeeId,
            email: result.data.email,
            phone: result.data.phone,
            teamId: result.data.teamId,
            team: result.data.team, // Include team object with name
            isTeamLeader: result.data.isTeamLeader,
            status: result.data.status,
            role: result.data.role // Include role information
          })
        } else {
          // Fallback to session data
          setEmployeeProfile({
            id: session.user.id,
            name: session.user.name || "Employee",
            employeeId: employeeId,
            email: session.user.email || "",
            phone: undefined,
            teamId: undefined,
            isTeamLeader: false,
            status: "ACTIVE",
            role: undefined
          })
        }
      } else {
        // Fallback to session data
        setEmployeeProfile({
          id: session.user.id,
          name: session.user.name || "Employee",
          employeeId: employeeId,
          email: session.user.email || "",
          phone: undefined,
          teamId: undefined,
          isTeamLeader: false,
          status: "ACTIVE",
          role: undefined
        })
      }

      // Fetch assigned vehicle (only relevant for field engineers)
      const vehicleResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vehicles/employee/${employeeId}`)
      if (vehicleResponse.ok) {
        const vehicleResult = await vehicleResponse.json()

        if (vehicleResult.success && vehicleResult.data) {
          setAssignedVehicle({
            id: vehicleResult.data.id,
            vehicleNumber: vehicleResult.data.vehicleNumber,
            make: vehicleResult.data.make,
            model: vehicleResult.data.model,
            type: vehicleResult.data.type,
            assignedAt: vehicleResult.data.assignedAt
          })
        } else {
          // ✅ IMPORTANT: clear stale state
          setAssignedVehicle(null)
        }
      } else {
        // ✅ vehicle endpoint returns 404 when unassigned
        setAssignedVehicle(null)
      }
    } catch (error) {
      console.error("Error fetching employee profile:", error)
      // Fallback to session data
      if (session?.user) {
        const employeeId = (session.user as { employeeId?: string })?.employeeId || ""
        setEmployeeProfile({
          id: session.user.id,
          name: session.user.name || "Employee",
          employeeId: employeeId,
          email: session.user.email || "",
          phone: undefined,
          teamId: undefined,
          isTeamLeader: false,
          status: "ACTIVE",
          role: undefined
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingSupportRequests = async () => {
    if (!employeeProfile || employeeProfile.role !== 'IN_OFFICE') return

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/customer-support/pending`,
        {
          headers: {
            Authorization: `Bearer ${(session?.user as { sessionToken?: string })?.sessionToken}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setPendingSupportRequests(data.data?.length || 0)
      }
    } catch (error) {
      console.error("Error fetching support requests:", error)
    }
  }

  const handleDayClockOut = async () => {
    if (!employeeProfile?.employeeId) return

    showConfirm(
      'Are you sure you want to clock out for the day? This will end your work day and unassign your vehicle.',
      async () => {
        try {
          setDayClockOutLoading(true)
          const response = await dayClockOut(employeeProfile.employeeId)

          if (response.success) {
            showToast.success('Day clock-out successful!', 'You have clocked out for the day')
            // Play notification sound for successful clock-out
            playNotificationSound()
            await fetchEmployeeProfile()
          } else {
            showToast.error(response.message || 'Failed to clock out')
          }
        } catch (error) {
          console.error('Error clocking out:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to clock out'
          showToast.error(errorMessage)
        } finally {
          setDayClockOutLoading(false)
        }
      },
      'Day Clock-Out'
    )
  }

  const handleLogout = () => {
    signOut({
      callbackUrl: '/',
      redirect: true
    })
  }

  const handleProductScan = (productId: string) => {
    setLastScannedProduct(productId)
    // Auto-hide notification after 5 seconds
    setTimeout(() => setLastScannedProduct(null), 5000)
  }

  const fetchTransactionHistory = async () => {
    try {
      setLoadingTransactions(true)
      setTransactionHistory([])

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      if (!backendUrl) throw new Error('Backend URL not configured')

      const sessionToken =
        (session as any)?.user?.sessionToken || (session as any)?.user?.accessToken
      if (!sessionToken) {
        console.warn('[Transactions] no session token')
        setTransactionHistory([])
        return
      }

      const res = await fetch(`${backendUrl}/products/transactions?limit=500`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        }
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('[Transactions] fetch failed', res.status, text)
        setTransactionHistory([])
        return
      }

      const payload = await res.json().catch(() => null)
      if (!payload) {
        setTransactionHistory([])
        return
      }

      // normalize similar to StockPage
      let transactions: any[] = []
      if (Array.isArray(payload)) transactions = payload
      else if (payload.success && Array.isArray(payload.data?.transactions)) transactions = payload.data.transactions
      else if (payload.success && Array.isArray(payload.data)) transactions = payload.data
      else {
        // find first array in payload
        const firstArr = Object.values(payload).find(v => Array.isArray(v)) as any[] | undefined
        transactions = firstArr ?? []
      }

      // debug
      console.debug('[Transactions] total from API:', transactions.length)
      console.debug('[Transactions] sample:', transactions[0])

      // be flexible when matching employee:
      const myUuid = (employeeProfile as any)?.id // user DB UUID
      const myEmployeeCode = (employeeProfile as any)?.employeeId // EMP001 (optional)

      const filtered = transactions.filter((t: any) => {
        if (!t) return false
        // top-level t.employeeId may be a UUID or empCode depending on backend
        if (t.employeeId && (t.employeeId === myUuid || t.employeeId === myEmployeeCode)) return true

        // nested employee object
        if (t.employee && (t.employee.id === myUuid || t.employee.employeeId === myEmployeeCode)) return true

        // older fields
        if (t.createdBy && (t.createdBy === myUuid || t.createdBy === myEmployeeCode)) return true

        return false
      })

      // store everything that passed — don't filter out product/relations here
      setTransactionHistory(filtered)
    } catch (err) {
      console.error('Error fetching transaction history:', err)
      setTransactionHistory([])
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleOpenTransactionHistory = () => {
    console.log('[TransactionHistory] Opening dialog for employee:', employeeProfile?.id, employeeProfile?.employeeId)
    setShowTransactionHistory(true)
    fetchTransactionHistory()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800"
      case "INACTIVE":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!employeeProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-4">Unable to load your employee profile.</p>
            <Button onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Sidebar item helper
  const NavItem = ({
    onClick,
    active,
    children
  }: { onClick: () => void, active?: boolean, children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-md flex items-center gap-3 text-sm font-medium ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
    >
      {children}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay + sidebar */}
      {/* Sidebar - fixed on large screens, slide-over on small */}
      {/* Desktop / large sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:bg-white lg:border-r lg:border-gray-200 lg:pt-6 lg:pb-6 lg:flex lg:flex-col">
        <div className="px-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Staff Portal</h1>
          </div>
          <div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="px-4 mt-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${employeeProfile.name}`}
                alt={employeeProfile.name}
              />
              <AvatarFallback className="text-sm">{getInitials(employeeProfile.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-semibold">{employeeProfile.name}</div>
              <div className="text-xs text-gray-500">{employeeProfile.employeeId}</div>
            </div>
          </div>
        </div>

        <nav className="mt-6 px-2 space-y-1 overflow-y-auto">
          <NavItem onClick={() => setActiveTab('attendance')} active={activeTab === 'attendance'}>
            <MapPin className="h-4 w-4" /> Attendance
          </NavItem>

          {hasFeatureAccess('DASHBOARD') && (
            <NavItem onClick={() => setActiveTab('dashboard')} active={activeTab === 'dashboard'}>
              <FileText className="h-4 w-4" /> Dashboard
            </NavItem>
          )}

          {hasFeatureAccess('PROJECT') && (
            <NavItem onClick={() => setActiveTab('project')} active={activeTab === 'project'}>
              <FileText className="h-4 w-4" /> Project
            </NavItem>
          )}

          {employeeProfile?.role === 'IN_OFFICE' && hasFeatureAccess('TICKETS') && (
            <NavItem onClick={() => setActiveTab('admin_ticket_management')} active={activeTab === 'admin_ticket_management'}>
              <FileText className="h-4 w-4" /> Ticket Management
            </NavItem>
          )}

          {hasFeatureAccess('TASK_MANAGEMENT') && (
            <NavItem onClick={() => setActiveTab('task_management')} active={activeTab === 'task_management'}>
              <FileText className="h-4 w-4" /> Task Management
            </NavItem>
          )}

          {employeeProfile?.role === 'FIELD_ENGINEER' && (
            <NavItem onClick={() => setActiveTab('tasks')} active={activeTab === 'tasks'}>
              <FileText className="h-4 w-4" /> Task Management
            </NavItem>
          )}


          {employeeProfile?.role === 'IN_OFFICE' && (
            <NavItem onClick={() => setActiveTab('support_requests')} active={activeTab === 'support_requests'}>
              <FileText className="h-4 w-4" /> Support Requests
            </NavItem>
          )}

          <NavItem onClick={() => setActiveTab('leave')} active={activeTab === 'leave'}>
            <FileText className="h-4 w-4" /> Leave
          </NavItem>

          <NavItem onClick={() => setActiveTab('documents')} active={activeTab === 'documents'}>
            <FileText className="h-4 w-4" /> Documents
          </NavItem>

          {employeeProfile?.role === 'FIELD_ENGINEER' && (
            <NavItem onClick={() => setActiveTab('vehicle')} active={activeTab === 'vehicle'}>
              <Car className="h-4 w-4" /> Vehicle
            </NavItem>
          )}

          {/* admin features condensed */}
          {hasFeatureAccess('CUSTOMERS') && (
            <NavItem onClick={() => setActiveTab('customers')} active={activeTab === 'customers'}>
              <User className="h-4 w-4" /> Customers
            </NavItem>
          )}

          {hasFeatureAccess('TEAMS') && (
            <NavItem onClick={() => setActiveTab('teams')} active={activeTab === 'teams'}>
              <User className="h-4 w-4" /> Teams
            </NavItem>
          )}

          {employeeProfile?.role === 'IN_OFFICE' && (
            <NavItem onClick={() => setActiveTab('tenders')} active={activeTab === 'tenders'}>
              <FileText className="h-4 w-4" /> Tenders
            </NavItem>
          )}

          {hasFeatureAccess('STOCK') && (
            <NavItem onClick={() => setActiveTab('stock')} active={activeTab === 'stock'}>
              <FileText className="h-4 w-4" /> Stock
            </NavItem>
          )}

          {hasFeatureAccess('HR_CENTER') && (
            <NavItem onClick={() => setActiveTab('hr_center')} active={activeTab === 'hr_center'}>
              <FileText className="h-4 w-4" /> HR Center
            </NavItem>
          )}

          {hasFeatureAccess('FIELD_ENGINEER_ATTENDANCE') && (
            <NavItem onClick={() => setActiveTab('field_engineer_attendance')} active={activeTab === 'field_engineer_attendance'}>
              <Clock className="h-4 w-4" /> Field Attendance
            </NavItem>
          )}

          {hasFeatureAccess('INOFFICE_ATTENDANCE') && (
            <NavItem onClick={() => setActiveTab('inoffice_attendance')} active={activeTab === 'inoffice_attendance'}>
              <Clock className="h-4 w-4" /> Office Attendance
            </NavItem>
          )}

          {hasFeatureAccess('CUSTOMER_SUPPORT_REQUESTS') && (
            <NavItem onClick={() => setActiveTab('customer_support_requests')} active={activeTab === 'customer_support_requests'}>
              <FileText className="h-4 w-4" /> Support
            </NavItem>
          )}

          {hasFeatureAccess('STAFF_FEATURE_ACCESS') && (
            <NavItem onClick={() => setActiveTab('staff_feature_access')} active={activeTab === 'staff_feature_access'}>
              <User className="h-4 w-4" /> Staff Access
            </NavItem>
          )}
        </nav>

        <div className="mt-auto px-4">
          {employeeProfile?.role === 'FIELD_ENGINEER' && (
            <Button
              onClick={handleOpenTransactionHistory}
              className="w-full mb-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <History className="h-4 w-4 mr-2" />
              Transaction History
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile slide-over sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-gray-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Staff Portal</h2>
              <button onClick={() => setSidebarOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${employeeProfile.name}`}
                    alt={employeeProfile.name}
                  />
                  <AvatarFallback className="text-sm">{getInitials(employeeProfile.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold">{employeeProfile.name}</div>
                  <div className="text-xs text-gray-500">{employeeProfile.employeeId}</div>
                </div>
              </div>

              <nav className="mt-6 space-y-1">
                {/* reuse same nav items as desktop */}
                <NavItem onClick={() => { setActiveTab('attendance'); setSidebarOpen(false) }} active={activeTab === 'attendance'}>
                  <MapPin className="h-4 w-4" /> Attendance
                </NavItem>
                <NavItem onClick={() => { setActiveTab('leave'); setSidebarOpen(false) }} active={activeTab === 'leave'}>
                  <FileText className="h-4 w-4" /> Leave
                </NavItem>
                <NavItem onClick={() => { setActiveTab('documents'); setSidebarOpen(false) }} active={activeTab === 'documents'}>
                  <FileText className="h-4 w-4" /> Documents
                </NavItem>
                <NavItem onClick={() => { handleLogout(); setSidebarOpen(false) }}>
                  <LogOut className="h-4 w-4" /> Logout
                </NavItem>
                {/* Field engineer: show Vehicle on mobile too */}
                {employeeProfile?.role === 'FIELD_ENGINEER' && (
                  <NavItem onClick={() => { setActiveTab('vehicle'); setSidebarOpen(false) }} active={activeTab === 'vehicle'}>
                    <Car className="h-4 w-4" /> Vehicle
                  </NavItem>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {/* Mobile hamburger */}
              <button className="lg:hidden p-2" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <Menu className="h-6 w-6 text-gray-700" />
              </button>

              <h1 className="text-xl font-semibold text-gray-900 hidden lg:block">Staff Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Barcode Scanner - Only for Field Engineers */}
              {employeeProfile?.role === 'FIELD_ENGINEER' && (
                <div className="flex items-center justify-center mr-2">
                  <BarcodeScanner
                    onScan={handleProductScan}
                  />
                </div>
              )}
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-sm text-gray-600">{employeeProfile.email}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back, {employeeProfile.name}! 👋
            </h2>
            <p className="text-gray-600 mt-1">
              Here&apos;s your staff portal dashboard. Manage your attendance and view your profile.
            </p>
            {employeeProfile.role === 'IN_OFFICE' && allowedFeatures.length === 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ℹ️ Additional admin features can be enabled by your administrator. Attendance, Leave, Documents, Tickets, and Tender Management are always available.
                </p>
              </div>
            )}
          </div>

          {/* Customer Support Notification Banner for IN_OFFICE employees */}
          {employeeProfile.role === 'IN_OFFICE' && pendingSupportRequests > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-orange-900">
                      {pendingSupportRequests} New Customer Support {pendingSupportRequests === 1 ? 'Request' : 'Requests'}
                    </p>
                    <p className="text-xs text-orange-700 mt-0.5">
                      Customer support requests are waiting for your attention
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push('/customer-support-requests')}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  View Requests ({pendingSupportRequests})
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${employeeProfile.name}`}
                        alt={employeeProfile.name}
                      />
                      <AvatarFallback className="text-lg">
                        {getInitials(employeeProfile.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <CardTitle className="text-xl">{employeeProfile.name}</CardTitle>
                  <p className="text-gray-600">{employeeProfile.employeeId}</p>
                  <Badge className={getStatusColor(employeeProfile.status)}>
                    {employeeProfile.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{employeeProfile.email}</span>
                  </div>
                  {employeeProfile.phone && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">{employeeProfile.phone}</span>
                    </div>
                  )}
                  {employeeProfile.team && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">Team: {employeeProfile.team.name}</span>
                    </div>
                  )}
                  {employeeProfile.isTeamLeader && (
                    <Badge variant="secondary">Team Leader</Badge>
                  )}
                </CardContent>
              </Card>

              {employeeProfile?.role === 'FIELD_ENGINEER' && (
                <Button
                  onClick={handleOpenTransactionHistory}
                  className="w-full mb-2 mt-3 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <History className="h-4 w-4 mr-2" />
                  Transaction History
                </Button>
              )}


            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              {activeTab === 'attendance' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <MapPin className="h-5 w-5 text-blue-500" />
                        <span>Attendance Management</span>
                      </CardTitle>
                      <p className="text-gray-600">
                        Mark your attendance with photo verification
                      </p>
                    </CardHeader>
                    <CardContent>
                      <EmployeeSelfAttendance />
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Many of the tabs are left as-is for brevity — they remain functionally identical
                  to your original implementation. The layout below adapts responsively because the
                  sidebar is fixed on large screens and becomes a slide-over on small screens. */}

              {activeTab === 'support_requests' && employeeProfile?.role === 'IN_OFFICE' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <span>Create Support Request</span>
                      </CardTitle>
                      <p className="text-gray-600">
                        Submit a support request or report an issue
                      </p>
                    </CardHeader>
                    <CardContent>
                      <StaffTicketForm
                        employeeId={employeeProfile.employeeId}
                        onSuccess={() => setTicketRefreshTrigger(prev => prev + 1)}
                      />
                    </CardContent>
                  </Card>
                  <StaffTicketList
                    employeeId={employeeProfile.employeeId}
                    refreshTrigger={ticketRefreshTrigger}
                  />
                </div>
              )}

              {activeTab === 'leave' && (
                <div className="space-y-6">
                  <LeaveApplicationForm
                    employeeId={employeeProfile.employeeId}
                    employeeName={employeeProfile.name}
                    onSuccess={() => setLeaveRefreshTrigger(prev => prev + 1)}
                  />
                  <LeaveApplicationsList
                    employeeId={employeeProfile.employeeId}
                    refreshTrigger={leaveRefreshTrigger}
                  />
                </div>
              )}

              {activeTab === 'documents' && (
                <EmployeeDocuments employeeId={employeeProfile.employeeId} />
              )}

              {activeTab === 'vehicle' && employeeProfile?.role === 'FIELD_ENGINEER' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5 text-blue-500" />
                      Assigned Vehicle
                    </CardTitle>
                    <p className="text-gray-600">
                      Your currently assigned vehicle details
                    </p>
                  </CardHeader>

                  <CardContent>
                    {!assignedVehicle ? (
                      <div className="text-center py-8 text-gray-500">
                        <Car className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                        <p>No vehicle assigned</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Vehicle Number</span>
                          <span className="font-medium">{assignedVehicle.vehicleNumber}</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Make</span>
                          <span className="font-medium">{assignedVehicle.make}</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Model</span>
                          <span className="font-medium">{assignedVehicle.model}</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Type</span>
                          <span className="font-medium">{assignedVehicle.type}</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Assigned At</span>
                          <span className="font-medium">
                            {new Date(assignedVehicle.assignedAt).toLocaleDateString()}
                          </span>
                        </div>

                        <Button
                          onClick={handleDayClockOut}
                          disabled={dayClockOutLoading}
                          className="w-full mt-4"
                        >
                          {dayClockOutLoading ? 'Clocking Out...' : 'Day Clock-Out'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === 'tenders' && employeeProfile?.role === 'IN_OFFICE' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      Tender Management
                    </CardTitle>
                    <p className="text-gray-600">
                      Access tender and EMD tracking system
                    </p>
                  </CardHeader>

                  <CardContent>
                    <div className="text-center py-10">
                      <FileText className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Tender Management
                      </h3>
                      <p className="text-gray-600 mb-6">
                        View and manage tenders assigned to your office
                      </p>

                      <Button
                        onClick={() => router.push('/tenders')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Open Tender System
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'dashboard' &&
                employeeProfile?.role === 'IN_OFFICE' &&
                hasFeatureAccess('DASHBOARD') && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Dashboard</CardTitle>
                      <p className="text-gray-600">Overview and analytics</p>
                    </CardHeader>
                    <CardContent className="text-center py-10">
                      <Button onClick={() => router.push('/dashboard')}>
                        Open Dashboard
                      </Button>
                    </CardContent>
                  </Card>
                )}

              {activeTab === 'project' &&
                employeeProfile?.role === 'IN_OFFICE' &&
                hasFeatureAccess('PROJECT') && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Management</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-10">
                      <Button onClick={() => router.push('/projects')}>
                        Open Projects
                      </Button>
                    </CardContent>
                  </Card>
                )}


              {activeTab === 'task_management' &&
                hasFeatureAccess('TASK_MANAGEMENT') && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Task Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {employeeProfile?.role === 'FIELD_ENGINEER' ? (
                        <TaskCheckInOut employeeId={employeeProfile.employeeId} />
                      ) : (
                        <div className="text-center py-10">
                          <Button onClick={() => router.push('/task-management')}>
                            Open Task Management
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}


              {activeTab === 'customers' &&
                employeeProfile?.role === 'IN_OFFICE' &&
                hasFeatureAccess('CUSTOMERS') && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Customers</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-10">
                      <Button onClick={() => router.push('/customers')}>
                        Open Customers
                      </Button>
                    </CardContent>
                  </Card>
                )}

              {activeTab === 'teams' &&
                employeeProfile?.role === 'IN_OFFICE' &&
                hasFeatureAccess('TEAMS') && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Teams</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-10">
                      <Button onClick={() => router.push('/teams')}>
                        Open Teams
                      </Button>
                    </CardContent>
                  </Card>
                )}

              {activeTab === 'stock' &&
                employeeProfile?.role === 'IN_OFFICE' &&
                hasFeatureAccess('STOCK') && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Stock Management</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-10">
                      <Button onClick={() => router.push('/stock')}>
                        Open Stock
                      </Button>
                    </CardContent>
                  </Card>
                )}

              {activeTab === 'hr_center' &&
                employeeProfile?.role === 'IN_OFFICE' &&
                hasFeatureAccess('HR_CENTER') && (
                  <Card>
                    <CardHeader>
                      <CardTitle>HR Center</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-10">
                      <Button onClick={() => router.push('/leave-management')}>
                        Open HR Center
                      </Button>
                    </CardContent>
                  </Card>
                )}

              {activeTab === 'field_engineer_attendance' &&
                hasFeatureAccess('FIELD_ENGINEER_ATTENDANCE') && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Field Attendance</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-10">
                      <Button onClick={() => router.push('/field-attendance')}>
                        Open Field Attendance
                      </Button>
                    </CardContent>
                  </Card>
                )}

              {activeTab === 'inoffice_attendance' &&
                hasFeatureAccess('INOFFICE_ATTENDANCE') && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Office Attendance</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-10">
                      <Button onClick={() => router.push('/office-attendance')}>
                        Open Office Attendance
                      </Button>
                    </CardContent>
                  </Card>
                )}

              {activeTab === 'customer_support_requests' &&
                employeeProfile?.role === 'IN_OFFICE' &&
                hasFeatureAccess('CUSTOMER_SUPPORT_REQUESTS') && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Customer Support</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-10">
                      <Button onClick={() => router.push('/customer-support-requests')}>
                        Open Support Requests
                      </Button>
                    </CardContent>
                  </Card>
                )}

              {activeTab === 'staff_feature_access' &&
                employeeProfile?.role === 'IN_OFFICE' &&
                hasFeatureAccess('STAFF_FEATURE_ACCESS') && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Staff feature access</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-10">
                      <Button onClick={() => router.push('/staff-feature-access')}>
                        Open staff feature access
                      </Button>
                    </CardContent>
                  </Card>
                )}

              {activeTab === 'tickets' &&
                hasFeatureAccess('TICKETS') && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Tickets</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-10">
                      <Button onClick={() => router.push('/tickets')}>
                        Open Tickets
                      </Button>
                    </CardContent>
                  </Card>
                )}

            </div>
          </div>

          {/* Transaction History Dialog (unchanged) */}
          <Dialog open={showTransactionHistory} onOpenChange={setShowTransactionHistory}>
            <DialogContent className="max-w-4xl max-h-96 overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Transaction History
                </DialogTitle>
              </DialogHeader>

              {loadingTransactions ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : transactionHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No transactions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactionHistory.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{transaction.product.productName}</p>
                          <p className="text-xs text-gray-500">SKU: {transaction.product.sku}</p>
                          <div className="flex gap-4 mt-2">
                            {transaction.checkoutQty > 0 && (
                              <div className="flex items-center gap-1 text-blue-600 text-xs">
                                <ArrowUpCircle className="h-3 w-3" />
                                <span>Checkout: {transaction.checkoutQty * transaction.barcode.boxQty}</span>
                              </div>
                            )}
                            {transaction.returnedQty > 0 && (
                              <div className="flex items-center gap-1 text-green-600 text-xs">
                                <ArrowDownCircle className="h-3 w-3" />
                                <span>Returned: {transaction.returnedQty}</span>
                              </div>
                            )}
                            {transaction.usedQty > 0 && (
                              <div className="flex items-center gap-1 text-amber-600 text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Used: {transaction.usedQty}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString('en-IN')}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(transaction.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>

        </div>
      </main>
    </div>
  )
}
