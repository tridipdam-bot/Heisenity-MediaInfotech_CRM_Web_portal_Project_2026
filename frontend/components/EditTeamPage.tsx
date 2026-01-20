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
  Save,
  Loader2,
  Search,
  CheckCircle,
  AlertCircle,
  Shield,
  UserCheck
} from "lucide-react"
import { getTeamById, updateTeam, updateTeamMembers, getAllEmployees, Team, Employee, UpdateTeamRequest, UpdateTeamMembersRequest } from "@/lib/server-api"
import { showToast } from "@/lib/toast-utils"

interface EditTeamPageProps {
  teamId: string
  onBack: () => void
  onTeamUpdated?: () => void
}

export function EditTeamPage({ teamId, onBack, onTeamUpdated }: EditTeamPageProps) {
  const [team, setTeam] = React.useState<Team | null>(null)
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedEmployees, setSelectedEmployees] = React.useState<Set<string>>(new Set())
  const [teamLeaderId, setTeamLeaderId] = React.useState<string>("")
  const [teamData, setTeamData] = React.useState({
    name: "",
    description: ""
  })

  // Fetch team data and employees on component mount
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch team data and employees in parallel
        const [teamResponse, employeesResponse] = await Promise.all([
          getTeamById(teamId),
          getAllEmployees({ limit: 1000, role: 'FIELD_ENGINEER' })
        ])
        
        if (teamResponse.success && teamResponse.data) {
          const teamData = teamResponse.data
          setTeam(teamData)
          setTeamData({
            name: teamData.name,
            description: teamData.description || ""
          })
          
          // Set selected employees and team leader from current team
          const memberIds = new Set(teamData.members.map(member => member.id))
          setSelectedEmployees(memberIds)
          
          const currentLeader = teamData.members.find(member => member.isTeamLeader)
          if (currentLeader) {
            setTeamLeaderId(currentLeader.id)
          }
        } else {
          showToast.error('Failed to load team data')
          onBack()
        }
        
        if (employeesResponse.success && employeesResponse.data) {
          setEmployees(employeesResponse.data.employees)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        showToast.error('Failed to load data')
        onBack()
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [teamId, onBack])

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
      showToast.error('Team name is required')
      return
    }

    if (selectedEmployees.size === 0) {
      showToast.error('Please select at least one team member')
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

    try {
      setSubmitting(true)
      
      // Update team info first
      const teamUpdateData: UpdateTeamRequest = {
        name: teamData.name.trim(),
        description: teamData.description.trim() || undefined
      }

      const teamResponse = await updateTeam(teamId, teamUpdateData)
      
      if (!teamResponse.success) {
        showToast.error(teamResponse.error || 'Failed to update team information')
        return
      }

      // Update team members
      const membersUpdateData: UpdateTeamMembersRequest = {
        memberIds: Array.from(selectedEmployees),
        teamLeaderId: teamLeaderId || undefined
      }

      const membersResponse = await updateTeamMembers(teamId, membersUpdateData)
      
      if (membersResponse.success) {
        showToast.success('Team updated successfully')
        onTeamUpdated?.()
        onBack()
      } else {
        showToast.error(membersResponse.error || 'Failed to update team members')
      }
    } catch (error: any) {
      console.error('Error updating team:', error)
      if (error.message.includes('already exists')) {
        showToast.error('A team with this name already exists')
      } else {
        showToast.error('Failed to update team. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading team data...</span>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Team not found</h2>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={onBack}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-6 w-6 text-blue-600" />
                  Edit Team
                </h1>
                <p className="text-gray-600">Update team information</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Information */}
          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                {/* Team Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={teamData.name}
                    onChange={(e) => setTeamData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter team name"
                    required
                    disabled={submitting}
                  />
                </div>

                {/* Team Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={teamData.description}
                    onChange={(e) => setTeamData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter team description (optional)"
                    rows={3}
                    disabled={submitting}
                  />
                </div>

                {/* Current Team Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-medium text-gray-900">Current Team Details</h3>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-2 font-medium">
                        {team ? new Date(team.createdAt).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="ml-2 font-medium">
                        {team ? new Date(team.updatedAt).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Team Members Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Team Members</span>
                <Badge variant="secondary">
                  {selectedEmployees.size} selected
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={submitting}
                />
              </div>

              {/* Employee List */}
              <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-2">
                {filteredEmployees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No employees found</p>
                  </div>
                ) : (
                  filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        selectedEmployees.has(employee.id)
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedEmployees.has(employee.id)}
                        onCheckedChange={() => handleEmployeeToggle(employee.id)}
                        disabled={submitting}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 truncate">
                            {employee.name}
                          </p>
                          {selectedEmployees.has(employee.id) && employee.id === teamLeaderId && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Leader
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{employee.employeeId}</span>
                          <span>{employee.email}</span>
                        </div>
                      </div>

                      {selectedEmployees.has(employee.id) && (
                        <Button
                          type="button"
                          variant={employee.id === teamLeaderId ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleTeamLeaderSelect(employee.id)}
                          disabled={submitting}
                          className={employee.id === teamLeaderId ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          {employee.id === teamLeaderId ? "Leader" : "Make Leader"}
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Members Summary */}
        {selectedEmployeesList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Selected Team Members ({selectedEmployeesList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedEmployeesList.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{employee.name}</p>
                      <p className="text-sm text-gray-600">{employee.employeeId}</p>
                    </div>
                    {employee.id === teamLeaderId && (
                      <Shield className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                ))}
              </div>

              {teamLeader && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Team Leader:</span>
                    <span className="text-green-700">{teamLeader.name} ({teamLeader.employeeId})</span>
                  </div>
                </div>
              )}

              {selectedEmployees.size > 0 && !teamLeaderId && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-800 font-medium">Team leader is required. Please select a team leader to continue.</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-end space-x-3">
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
                disabled={submitting || selectedEmployees.size === 0 || !teamLeaderId}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Team
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}