"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  ExternalLink,
  Webhook,
  Database
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CalendlyMeeting {
  id: string;
  meetingId: string;
  inviteeName: string;
  inviteeEmail: string;
  eventName: string;
  scheduledAt: string;
  meeting: {
    title: string;
    startTime: string;
    status: string;
  };
}

export default function CalendlyIntegrationStatus() {
  const { toast } = useToast();
  const [calendlyMeetings, setCalendlyMeetings] = useState<CalendlyMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [apiToken, setApiToken] = useState("");

  const fetchCalendlyMeetings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meetings?calendly=true`);
      const result = await response.json();
      
      if (result.success) {
        // Filter meetings that have Calendly data
        const calendlyMeetings = result.data.meetings.filter((meeting: any) => meeting.calendlyMeeting);
        setCalendlyMeetings(calendlyMeetings);
      }
    } catch (error) {
      console.error('Error fetching Calendly meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportMeetings = async () => {
    if (!apiToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Calendly API token",
        variant: "destructive"
      });
      return;
    }

    try {
      setImportLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/calendly/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calendlyApiToken: apiToken,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          endDate: new Date().toISOString()
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Calendly meetings import initiated"
        });
        fetchCalendlyMeetings();
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      console.error('Error importing meetings:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import meetings",
        variant: "destructive"
      });
    } finally {
      setImportLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendlyMeetings();
  }, []);

  const webhookUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/calendly/webhook`;

  return (
    <div className="space-y-6">
      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Calendly Integration Status
          </CardTitle>
          <CardDescription>
            Automatically sync Calendly meetings to your company database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook Setup */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Webhook className="h-4 w-4 text-green-600" />
              <h4 className="font-medium">Webhook Configuration</h4>
              <Badge variant="outline" className="text-green-700 bg-green-50">Ready</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Add this webhook URL to your Calendly account to automatically sync new meetings:
            </p>
            <div className="flex items-center gap-2">
              <Input 
                value={webhookUrl} 
                readOnly 
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast({ title: "Copied!", description: "Webhook URL copied to clipboard" });
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* Manual Import */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Download className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium">Manual Import</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Import existing meetings from your Calendly account
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="api-token">Calendly API Token</Label>
                <Input
                  id="api-token"
                  type="password"
                  placeholder="Enter your Calendly API token"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleImportMeetings}
                disabled={importLoading}
                className="w-full"
              >
                {importLoading ? "Importing..." : "Import Last 30 Days"}
              </Button>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Go to your Calendly account settings</li>
              <li>2. Navigate to "Webhooks" section</li>
              <li>3. Add the webhook URL above</li>
              <li>4. Select events: "Invitee Created" and "Invitee Canceled"</li>
              <li>5. Save the webhook configuration</li>
            </ol>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.open('https://calendly.com/integrations/webhooks', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Calendly Webhooks
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Synced Meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-green-600" />
            Synced Calendly Meetings
            <Badge variant="secondary">{calendlyMeetings.length}</Badge>
          </CardTitle>
          <CardDescription>
            Meetings automatically imported from Calendly
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading synced meetings...</span>
            </div>
          ) : calendlyMeetings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No Calendly meetings synced yet</p>
              <p className="text-sm text-gray-400">Set up the webhook to start syncing automatically</p>
            </div>
          ) : (
            <div className="space-y-3">
              {calendlyMeetings.map((meeting) => (
                <div key={meeting.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{meeting.meeting.title}</h4>
                      <p className="text-sm text-gray-600">
                        {meeting.inviteeName} ({meeting.inviteeEmail})
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(meeting.meeting.startTime).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={
                          meeting.meeting.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          meeting.meeting.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }
                      >
                        {meeting.meeting.status}
                      </Badge>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}