"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { QRScanner } from "@/components/QRScanner"
import { NotificationBell } from "@/components/NotificationBell"
import { 
  Users, 
  Ticket, 
  Package,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart3,
  Truck,
  ShoppingCart,
  FileText,
  Calendar,
  Eye
} from "lucide-react"
import Link from "next/link"

export function Dashboard() {
  const [lastScannedProduct, setLastScannedProduct] = React.useState<string | null>(null)
  const [leaveApplications, setLeaveApplications] = React.useState<any[]>([])
  const [loadingLeaves, setLoadingLeaves] = React.useState(true)

  const handleProductScan = (productId: string) => {
    setLastScannedProduct(productId)
    // Auto-hide notification after 5 seconds
    setTimeout(() => setLastScannedProduct(null), 5000)
  }

  // Fetch recent leave applications
  React.useEffect(() => {
    const fetchLeaveApplications = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/leave/applications`)
        const result = await response.json()
        
        if (result.success) {
          // Get only pending applications, sorted by most recent
          const pendingApplications = (result.data || [])
            .filter((app: any) => app.status === 'PENDING')
            .sort((a: any, b: any) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
            .slice(0, 3) // Show only 3 most recent
          
          setLeaveApplications(pendingApplications)
        }
      } catch (error) {
        console.error('Error fetching leave applications:', error)
      } finally {
        setLoadingLeaves(false)
      }
    }

    fetchLeaveApplications()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Scan notification */}
      {lastScannedProduct && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2">
          <Package className="h-4 w-4" />
          <span className="text-sm font-medium">Product {lastScannedProduct} scanned!</span>
        </div>
      )}
      
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back! Here's what's happening in your organization.</p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <QRScanner onScan={handleProductScan} />
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Employees</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">247</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+2.5%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">vs last month</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Stock Items</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Package className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">1,247</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+8.2%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">items in inventory</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Active Tickets</CardTitle>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Ticket className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">23</span>
                  <div className="flex items-center gap-1 text-red-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+15.2%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">vs yesterday</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Present Today</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">234</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+5.2%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">94.7% attendance</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Leave Applications */}
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Pending Leave Applications
                </CardTitle>
                <Link href="/leave-management">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingLeaves ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : leaveApplications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No pending leave applications</p>
                </div>
              ) : (
                leaveApplications.map((application) => (
                  <div key={application.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {application.employeeName} ({application.employeeId})
                        </p>
                        <p className="text-sm text-gray-500">
                          {application.leaveType.replace('_', ' ')} - {new Date(application.startDate).toLocaleDateString()} to {new Date(application.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      Pending
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Recent Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">System Login Issues</p>
                    <p className="text-sm text-gray-500">Reported by Sarah Johnson</p>
                  </div>
                </div>
                <Badge className="bg-red-50 text-red-700 border-red-200">High</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">CCTV Not Working</p>
                    <p className="text-sm text-gray-500">Reported by Michael Chen</p>
                  </div>
                </div>
                <Badge className="bg-amber-50 text-amber-700 border-amber-200">Medium</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Software Update Request</p>
                    <p className="text-sm text-gray-500">Reported by Emily Rodriguez</p>
                  </div>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200">Low</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Stock Overview */}
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Stock Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Package className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Items In Stock</p>
                    <p className="text-sm text-gray-500">Available inventory</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-700">1,189</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Low Stock Items</p>
                    <p className="text-sm text-gray-500">Need restocking</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-amber-700">23</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Truck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Pending Orders</p>
                    <p className="text-sm text-gray-500">Orders in transit</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-blue-700">7</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Stock Value</CardTitle>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">₹84.2L</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+12.5%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">total inventory value</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Monthly Orders</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">156</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+18.3%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">orders this month</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Avg Response Time</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">2.4h</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingDown className="h-3 w-3" />
                    <span className="text-sm font-medium">-12%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">faster than last week</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}