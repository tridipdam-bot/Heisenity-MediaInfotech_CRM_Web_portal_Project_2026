import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users,
  Plus,
  Shield,
  Trash2,
  Edit
} from "lucide-react"
import { getAllTeams, Team, deleteTeam } from "@/lib/server-api"
import { CreateTeamPage } from "./CreateTeamPage"
import { EditTeamPage } from "./EditTeamPage"
import { showToast, showConfirm } from "@/lib/toast-utils"

type ViewMode = 'list' | 'create' | 'edit'

export function TeamManagementPage() {
  const [teams, setTeams] = React.useState<Team[]>([])
  const [loading, setLoading] = React.useState(true)
  const [viewMode, setViewMode] = React.useState<ViewMode>('list')
  const [editingTeamId, setEditingTeamId] = React.useState<string | null>(null)
  const [deletingTeamId, setDeletingTeamId] = React.useState<string | null>(null)

  // Fetch teams on component mount
  React.useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const response = await getAllTeams()
      if (response.success && response.data) {
        setTeams(response.data)
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTeamCreated = () => {
    fetchTeams() // Refresh the teams list
    setViewMode('list')
  }

  const handleTeamUpdated = () => {
    fetchTeams() // Refresh the teams list
    setViewMode('list')
  }

  const handleEditTeam = (teamId: string) => {
    setEditingTeamId(teamId)
    setViewMode('edit')
  }

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    showConfirm(
      `Are you sure you want to delete the team "${teamName}"? This action cannot be undone and will remove all members from the team.`,
      async () => {
        try {
          setDeletingTeamId(teamId)
          const response = await deleteTeam(teamId)
          
          if (response.success) {
            // Remove the team from the local state
            setTeams(prevTeams => prevTeams.filter(team => team.id !== teamId))
            showToast.success('Team deleted successfully')
          } else {
            showToast.error(response.error || 'Failed to delete team')
          }
        } catch (error) {
          console.error('Error deleting team:', error)
          showToast.error('Failed to delete team. Please try again.')
        } finally {
          setDeletingTeamId(null)
        }
      },
      'Delete Team'
    )
  }

  if (viewMode === 'create') {
    return (
      <CreateTeamPage 
        onBack={() => setViewMode('list')}
        onTeamCreated={handleTeamCreated}
      />
    )
  }

  if (viewMode === 'edit' && editingTeamId) {
    return (
      <EditTeamPage 
        teamId={editingTeamId}
        onBack={() => {
          setViewMode('list')
          setEditingTeamId(null)
        }}
        onTeamUpdated={handleTeamUpdated}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-600" />
                Team Management
              </h1>
              <p className="text-gray-600">Manage teams and their members</p>
            </div>
            <Button 
              onClick={() => setViewMode('create')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </div>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-white shadow-sm border-gray-200">
                <CardHeader className="pb-3">
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : teams.length === 0 ? (
            <div className="col-span-full">
              <Card className="bg-white shadow-sm border-gray-200">
                <CardContent className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No teams yet</h3>
                  <p className="text-gray-600 mb-4">Create your first team to get started</p>
                  <Button 
                    onClick={() => setViewMode('create')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Team
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            teams.map((team) => (
              <Card key={team.id} className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      {team.name}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleEditTeam(team.id)}
                        title="Edit team"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        disabled={deletingTeamId === team.id}
                        title="Delete team"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {team.description && (
                    <p className="text-sm text-gray-600">{team.description}</p>
                  )}
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                    </Badge>
                    {team.teamLeader && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {team.teamLeader.name}
                      </Badge>
                    )}
                  </div>

                  {team.members.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Members</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {team.members.slice(0, 3).map((member) => (
                          <div key={member.id} className="flex items-center gap-2 text-sm">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                              {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <span className="text-gray-700">{member.name}</span>
                            {member.isTeamLeader && (
                              <Shield className="h-3 w-3 text-green-600" />
                            )}
                          </div>
                        ))}
                        {team.members.length > 3 && (
                          <p className="text-xs text-gray-500 pl-8">
                            +{team.members.length - 3} more member{team.members.length - 3 !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}