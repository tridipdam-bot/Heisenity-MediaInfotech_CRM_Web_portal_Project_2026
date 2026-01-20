import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  Shield,
  UserCheck,
  Plus
} from "lucide-react"
import { getAllEmployees, Employee, createTeam, CreateTeamRequest } from "@/lib/server-api"
import { showToast } from "@/lib/toast-utils"

interface CreateTeamPageProps {
  onBack: () => void
  onTeamCreated?: () => void
}

export function CreateTeamPage({ onBack, onTeamCreated }: CreateTeamPageProps) {
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedEmployees, setSelectedEmployees] = React.useState<Set<string>>(new Set())
  const [teamLeaderId, setTeamLeaderId] = React.useState<string>("")
  const [teamData, setTeamData] = React.useState({
    name: "",
    description: ""
  })
  const [submitting, setSubmitting] = React.useState(false)

  // Fetch employees on component mount
  React.useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true)
        const response = await getAllEmployees({ limit: 1000, role: 'FIELD_ENGINEER' })
        if (response.success && response.data) {
          setEmployees(response.data.employees)
        }
      } catch (error) {
        console.error('Error fetching employees:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEmployees()
  }, [])

  // Filter employees based on search term
  const filteredEmployees = React.useMemo(() => {
    if (!searchTerm) return employees
    return employees.filter(employee => 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [employees, searchTerm])

  const selectedEmployeesList = employees.filter(emp => selectedEmployees.has(emp.id))
  const teamLeader = employees.find(emp => emp.id === teamLeaderId)

  const handleEmployeeToggle = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees)
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId)
      // If removing team leader, clear team leader selection
      if (employeeId === teamLeaderId) {
        setTeamLeaderId("")
      }
    } else {
      newSelected.add(employeeId)
    }
    setSelectedEmployees(newSelected)
  }

  const handleTeamLeaderSelect = (employeeId: string) => {
    if (selectedEmployees.has(employeeId)) {
      setTeamLeaderId(teamLeaderId === employeeId ? "" : employeeId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!teamData.name.trim()) {
      showToast.error('Please enter a team name')
      return
    }

    if (selectedEmployees.size === 0) {
      showToast.error('Please select at least one employee for the team')
      return
    }

    if (!teamLeaderId) {
      showToast.error('Please select a team leader')
      return
    }

    if (teamLeaderId && !selectedEmployees.has(teamLeaderId)) {
      showToast.error('Team leader must be one of the selected members')
      return
    }

    setSubmitting(true)
    
    try {
      const teamRequest: CreateTeamRequest = {
        name: teamData.name.trim(),
        description: teamData.description.trim() || undefined,
        memberIds: Array.from(selectedEmployees),
        teamLeaderId: teamLeaderId || undefined
      }

      const response = await createTeam(teamRequest)
      
      if (response.success) {
        showToast.success(`Team "${teamData.name}" created successfully with ${selectedEmployees.size} member${selectedEmployees.size !== 1 ? 's' : ''}!`)
        if (onTeamCreated) {
          onTeamCreated()
        }
        onBack()
      } else {
        throw new Error(response.error || 'Failed to create team')
      }
    } catch (error) {
      console.error('Error creating team:', error)
      showToast.error('Failed to create team. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setTeamData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onBack}
              className="border-gray-300 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Plus className="h-6 w-6 text-blue-600" />
                Create New Team
              </h1>
              <p className="text-gray-600">Create a team and assign employees</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Details Form */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Team Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Team Name */}
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Name *</Label>
                  <Input
                    id="team-name"
                    placeholder="Enter team name..."
                    value={teamData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Team Description */}
                <div className="space-y-2">
                  <Label htmlFor="team-description">Description</Label>
                  <Textarea
                    id="team-description"
                    placeholder="Describe the team's purpose..."
                    value={teamData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 min-h-[80px]"
                  />
                </div>

                <Separator />

                {/* Selected Members Summary */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Selected Members</Label>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      {selectedEmployees.size} selected
                    </Badge>
                  </div>
                  
                  {selectedEmployeesList.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedEmployeesList.map((employee) => (
                        <div key={employee.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                            {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{employee.name}</p>
                            <p className="text-xs text-gray-500 truncate">{employee.employeeId}</p>
                          </div>
                          {employee.id === teamLeaderId && (
                            <Shield className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No members selected</p>
                  )}

                  {/* Team Leader Selection */}
                  {selectedEmployees.size > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-red-600">Team Leader (Required) *</Label>
                      {!teamLeaderId && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs text-red-600">Please select a team leader to continue</p>
                        </div>
                      )}
                      <div className="space-y-1">
                        {selectedEmployeesList.map((employee) => (
                          <div key={employee.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`leader-${employee.id}`}
                              checked={teamLeaderId === employee.id}
                              onCheckedChange={() => handleTeamLeaderSelect(employee.id)}
                            />
                            <Label 
                              htmlFor={`leader-${employee.id}`}
                              className="text-sm cursor-pointer flex items-center gap-2"
                            >
                              <span>{employee.name}</span>
                              {teamLeaderId === employee.id && (
                                <Shield className="h-3 w-3 text-green-600" />
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Employee Selection */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Select Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search employees..."
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Employee List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-500">Loading employees...</p>
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No employees found</p>
                    </div>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <div 
                        key={employee.id} 
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedEmployees.has(employee.id) 
                            ? 'border-blue-300 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleEmployeeToggle(employee.id)}
                      >
                        <Checkbox
                          checked={selectedEmployees.has(employee.id)}
                          onChange={() => handleEmployeeToggle(employee.id)}
                        />
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{employee.name}</p>
                          <p className="text-sm text-gray-600">{employee.employeeId}</p>
                          <p className="text-xs text-gray-500 truncate">{employee.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {employee.isTeamLeader && (
                            <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                              Current Leader
                            </Badge>
                          )}
                          {employee.teamId && (
                            <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                              Has Team
                            </Badge>
                          )}
                          {selectedEmployees.has(employee.id) && (
                            <UserCheck className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <AlertCircle className="h-4 w-4" />
                    Select employees and choose a team leader (required)
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onBack}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={submitting || !teamData.name.trim() || selectedEmployees.size === 0 || !teamLeaderId}
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Create Team
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}