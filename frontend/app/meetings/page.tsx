"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Plus, 
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  ExternalLink
} from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import CreateMeetingDialog from "@/components/CreateMeetingDialog";
import MeetingDetailsDialog from "@/components/MeetingDetailsDialog";
import CalendlyIntegrationStatus from "@/components/CalendlyIntegrationStatus";
import { useToast } from "@/hooks/use-toast";

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  meetingType: string;
  status: string;
  priority: string;
  meetingLink?: string;
  agenda?: string;
  notes?: string;
  organizerAdmin?: {
    id: string;
    name: string;
    adminId: string;
    email: string;
  };
  organizerEmployee?: {
    id: string;
    name: string;
    employeeId: string;
    email: string;
  };
  customer?: {
    id: string;
    customerId: string;
    name: string;
    email?: string;
    phone: string;
  };
  attendees: Array<{
    id: string;
    status: string;
    response?: string;
    employee: {
      id: string;
      name: string;
      employeeId: string;
      email: string;
    };
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    status: string;
    dueDate?: string;
    assignee?: {
      id: string;
      name: string;
      employeeId: string;
    };
  }>;
}

export default function MeetingsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [todaysMeetings, setTodaysMeetings] = useState<Meeting[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Helper function to get organizer information
  const getOrganizer = (meeting: Meeting) => {
    return meeting.organizerAdmin || meeting.organizerEmployee;
  };

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meetings`);
      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data.meetings)) {
        setMeetings(result.data.meetings);
      } else {
        console.warn('Invalid meetings data received:', result);
        setMeetings([]);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setMeetings([]);
      toast({
        title: "Error",
        description: "Failed to fetch meetings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaysMeetings = async () => {
    if (!session?.user) return;
    
    try {
      const employeeId = (session.user as any).id;
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meetings/employee/${employeeId}/today`);
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setTodaysMeetings(result.data);
      } else {
        console.warn('Invalid today\'s meetings data received:', result);
        setTodaysMeetings([]);
      }
    } catch (error) {
      console.error('Error fetching today\'s meetings:', error);
      setTodaysMeetings([]);
    }
  };

  const fetchUpcomingMeetings = async () => {
    if (!session?.user) return;
    
    try {
      const employeeId = (session.user as any).id;
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meetings/employee/${employeeId}/upcoming`);
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setUpcomingMeetings(result.data);
      } else {
        console.warn('Invalid upcoming meetings data received:', result);
        setUpcomingMeetings([]);
      }
    } catch (error) {
      console.error('Error fetching upcoming meetings:', error);
      setUpcomingMeetings([]);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchMeetings();
      fetchTodaysMeetings();
      fetchUpcomingMeetings();
    }
  }, [session]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      SCHEDULED: { color: "bg-blue-100 text-blue-800", label: "Scheduled" },
      IN_PROGRESS: { color: "bg-green-100 text-green-800", label: "In Progress" },
      COMPLETED: { color: "bg-gray-100 text-gray-800", label: "Completed" },
      CANCELLED: { color: "bg-red-100 text-red-800", label: "Cancelled" },
      POSTPONED: { color: "bg-yellow-100 text-yellow-800", label: "Postponed" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.SCHEDULED;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      LOW: { color: "bg-gray-100 text-gray-800", label: "Low" },
      MEDIUM: { color: "bg-blue-100 text-blue-800", label: "Medium" },
      HIGH: { color: "bg-orange-100 text-orange-800", label: "High" },
      URGENT: { color: "bg-red-100 text-red-800", label: "Urgent" }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.MEDIUM;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CLIENT': return <User className="h-4 w-4" />;
      case 'VENDOR': return <Users className="h-4 w-4" />;
      case 'TRAINING': return <AlertCircle className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const formatMeetingTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isToday(start)) {
      return `Today, ${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
    } else if (isTomorrow(start)) {
      return `Tomorrow, ${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
    } else if (isThisWeek(start)) {
      return `${format(start, 'EEEE, h:mm a')} - ${format(end, 'h:mm a')}`;
    } else {
      return `${format(start, 'MMM d, h:mm a')} - ${format(end, 'h:mm a')}`;
    }
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setDetailsDialogOpen(true);
  };

  const handleMeetingCreated = () => {
    fetchMeetings();
    fetchTodaysMeetings();
    fetchUpcomingMeetings();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading meetings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meetings & Tasks</h1>
          <p className="text-gray-600 mt-1">Manage your meetings and daily tasks</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/your-calendly-username';
              window.open(calendlyUrl, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
            }}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Quick Calendly
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="today">Today's Schedule</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="all">All Meetings</TabsTrigger>
          <TabsTrigger value="calendly">Calendly Sync</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Today's Meetings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Today's Meetings
                </CardTitle>
                <CardDescription>
                  {todaysMeetings.length} meeting{todaysMeetings.length !== 1 ? 's' : ''} scheduled
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todaysMeetings.length === 0 ? (
                  <p className="text-gray-500 text-sm">No meetings today</p>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(todaysMeetings) && todaysMeetings.slice(0, 3).map((meeting) => (
                      <div 
                        key={meeting.id} 
                        className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                        onClick={() => handleMeetingClick(meeting)}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{meeting.title}</h4>
                          {getStatusBadge(meeting.status)}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {format(new Date(meeting.startTime), 'h:mm a')} - {format(new Date(meeting.endTime), 'h:mm a')}
                        </p>
                      </div>
                    ))}
                    {todaysMeetings.length > 3 && (
                      <p className="text-xs text-gray-500">+{todaysMeetings.length - 3} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Meetings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  Upcoming Meetings
                </CardTitle>
                <CardDescription>
                  Next {upcomingMeetings.length} meeting{upcomingMeetings.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingMeetings.length === 0 ? (
                  <p className="text-gray-500 text-sm">No upcoming meetings</p>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(upcomingMeetings) && upcomingMeetings.slice(0, 3).map((meeting) => (
                      <div 
                        key={meeting.id} 
                        className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                        onClick={() => handleMeetingClick(meeting)}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{meeting.title}</h4>
                          {getPriorityBadge(meeting.priority)}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {formatMeetingTime(meeting.startTime, meeting.endTime)}
                        </p>
                      </div>
                    ))}
                    {upcomingMeetings.length > 3 && (
                      <p className="text-xs text-gray-500">+{upcomingMeetings.length - 3} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  Today's Tasks
                </CardTitle>
                <CardDescription>
                  Tasks from today's meetings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(todaysMeetings) && todaysMeetings.flatMap(meeting => 
                    Array.isArray(meeting.tasks) ? meeting.tasks : []
                  ).length === 0 ? (
                    <p className="text-gray-500 text-sm">No tasks for today</p>
                  ) : (
                    Array.isArray(todaysMeetings) && todaysMeetings.flatMap(meeting => 
                      Array.isArray(meeting.tasks) ? meeting.tasks : []
                    ).slice(0, 3).map((task) => (
                      <div key={task.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <Badge className={
                            task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {task.assignee && (
                          <p className="text-xs text-gray-600 mt-1">
                            Assigned to: {task.assignee.name}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Today's Schedule Tab */}
        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todaysMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No meetings scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(todaysMeetings) && todaysMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => handleMeetingClick(meeting)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(meeting.meetingType)}
                            <h3 className="font-semibold">{meeting.title}</h3>
                            {getStatusBadge(meeting.status)}
                            {getPriorityBadge(meeting.priority)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(new Date(meeting.startTime), 'h:mm a')} - {format(new Date(meeting.endTime), 'h:mm a')}
                            </div>
                            {meeting.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {meeting.location}
                              </div>
                            )}
                            {meeting.meetingLink && (
                              <div className="flex items-center gap-1">
                                <Video className="h-4 w-4" />
                                Virtual
                              </div>
                            )}
                          </div>
                          
                          {meeting.description && (
                            <p className="text-sm text-gray-600 mb-2">{meeting.description}</p>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Organizer:</span>
                            <span>{getOrganizer(meeting)?.name}</span>
                            {meeting.attendees.length > 0 && (
                              <>
                                <span className="text-gray-500">• Attendees:</span>
                                <span>{meeting.attendees.length}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>
                Your scheduled meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No upcoming meetings</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(upcomingMeetings) && upcomingMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => handleMeetingClick(meeting)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(meeting.meetingType)}
                            <h3 className="font-semibold">{meeting.title}</h3>
                            {getStatusBadge(meeting.status)}
                            {getPriorityBadge(meeting.priority)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatMeetingTime(meeting.startTime, meeting.endTime)}
                            </div>
                            {meeting.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {meeting.location}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Organizer:</span>
                            <span>{getOrganizer(meeting)?.name}</span>
                            {meeting.attendees.length > 0 && (
                              <>
                                <span className="text-gray-500">• Attendees:</span>
                                <span>{meeting.attendees.length}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Meetings Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Meetings</CardTitle>
              <CardDescription>
                Complete list of meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {meetings.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No meetings found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(meetings) && meetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => handleMeetingClick(meeting)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(meeting.meetingType)}
                            <h3 className="font-semibold">{meeting.title}</h3>
                            {getStatusBadge(meeting.status)}
                            {getPriorityBadge(meeting.priority)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatMeetingTime(meeting.startTime, meeting.endTime)}
                            </div>
                            {meeting.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {meeting.location}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Organizer:</span>
                            <span>{getOrganizer(meeting)?.name}</span>
                            {meeting.customer && (
                              <>
                                <span className="text-gray-500">• Customer:</span>
                                <span>{meeting.customer.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendly Sync Tab */}
        <TabsContent value="calendly" className="space-y-4">
          <CalendlyIntegrationStatus />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateMeetingDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onMeetingCreated={handleMeetingCreated}
      />
      
      <MeetingDetailsDialog
        meeting={selectedMeeting}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onMeetingUpdated={handleMeetingCreated}
      />
    </div>
  );
}