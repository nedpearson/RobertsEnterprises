import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Phone, 
  Mail, 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  CheckCircle, 
  MessageSquare, 
  Play, 
  AlertCircle, 
  Sparkles,
  Lock,
  UserCheck
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useAIRecommendations,
  useStaffProfiles,
  useCreateHold,
  useConfirmHold,
  useTransitionRequestStatus,
  useAssignAppointmentRequest
} from '@/lib/services/schedulingService';
import { useVowosData } from '@/contexts/VowosDataContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function Request360Panel({ requestId, request, onClose }: { requestId?: string, request: any, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('summary');
  const queryClient = useQueryClient();
  const reqId = requestId || request?.id;
  
  const { businessId } = useVowosData();
  const { data: staff = [] } = useStaffProfiles();
  const { data: aiRecs = [] } = useAIRecommendations(reqId);
  
  const createHoldMutation = useCreateHold();
  const confirmHoldMutation = useConfirmHold();
  const transitionStatusMutation = useTransitionRequestStatus();
  const assignRequestMutation = useAssignAppointmentRequest();

  // Fetch active holds for this request
  const { data: activeHolds = [], refetch: refetchHolds } = useQuery({
    queryKey: ['activeHolds', reqId],
    queryFn: async () => {
      if (!reqId) return [];
      const { data, error } = await supabase
        .from('appointment_holds')
        .select('*, employee:staff_profiles(*)')
        .eq('request_id', reqId)
        .gt('expires_at', new Date().toISOString());
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!reqId
  });

  if (!request && !reqId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-8 text-center bg-background">
        Select a request from the queue to view the 360° details.
      </div>
    );
  }

  const customerName = request?.customerName || (request?.customer ? `${request.customer.first_name || ''} ${request.customer.last_name || ''}`.trim() : null);
  const initials = customerName ? customerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '?';
  const status = (request?.status || 'PENDING').toUpperCase();

  const handleCreateHold = async (rec: any) => {
    if (!reqId || !businessId) return;
    try {
      await createHoldMutation.mutateAsync({
        requestId: reqId,
        employeeId: rec.employee_id,
        businessId,
        locationId: rec.location_id,
        roomId: rec.room_id || null,
        startAt: rec.proposed_start_at,
        endAt: rec.proposed_end_at
      });
      toast.success('Tentative hold created successfully for 15 minutes.');
      refetchHolds();
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
    } catch (err: any) {
      toast.error('Failed to create hold: ' + err.message);
    }
  };

  const handleConfirmHold = async (holdId: string) => {
    try {
      await confirmHoldMutation.mutateAsync({ holdId });
      toast.success('Hold confirmed successfully! Appointment is scheduled.');
      refetchHolds();
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (err: any) {
      toast.error('Failed to confirm hold: ' + err.message);
    }
  };

  const handleDirectConfirm = async (rec: any) => {
    if (!reqId) return;
    try {
      await assignRequestMutation.mutateAsync({
        requestId: reqId,
        employeeId: rec.employee_id,
        roomId: rec.room_id || '00000000-0000-0000-0000-000000000000',
        startAt: rec.proposed_start_at,
        endAt: rec.proposed_end_at
      });
      toast.success('Appointment assigned and confirmed successfully!');
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (err: any) {
      toast.error('Failed to confirm appointment: ' + err.message);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!reqId) return;
    try {
      await transitionStatusMutation.mutateAsync({
        requestId: reqId,
        newStatus
      });
      toast.success(`Request status transitioned to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
    } catch (err: any) {
      toast.error('Failed to transition status: ' + err.message);
    }
  };

  const renderMissing = (label: string) => (
    <div className="flex items-center gap-1.5 text-muted-foreground/60 text-xs italic">
      <AlertCircle className="h-3 w-3" /> Missing {label}
    </div>
  );

  return (
    <div className="h-full flex flex-col border-l bg-background">
      {/* Header */}
      <div className="relative overflow-hidden border-b bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-950/20 dark:via-background dark:to-cyan-950/20">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
        <div className="p-5 pt-6 flex justify-between items-start z-10">
          <div className="flex gap-4 items-center">
            <Avatar className="h-14 w-14 border-2 border-white shadow-md ring-1 ring-black/5 bg-background">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-foreground">{customerName || renderMissing('Customer Identity')}</h2>
                <Badge className={
                  status === 'PENDING' || status === 'NEW' ? 'bg-amber-500/10 text-amber-600 border-amber-200' :
                  status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
                  'bg-gray-500/10 text-gray-600 border-gray-200'
                } variant="outline">
                  {status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-3">
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {request?.customerPhone || request?.customer?.phone || renderMissing('Phone')}</span>
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {request?.customerEmail || request?.customer?.email || renderMissing('Email')}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-black/5">
            &times;
          </Button>
        </div>
      </div>

      {/* Active Holds Banner */}
      {activeHolds.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center justify-between text-xs text-amber-900 shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Hold active for <strong>{activeHolds[0].employee?.name}</strong>. Expires {new Date(activeHolds[0].expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
            </span>
          </div>
          <Button 
            size="xs" 
            onClick={() => handleConfirmHold(activeHolds[0].id)} 
            disabled={confirmHoldMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
          >
            {confirmHoldMutation.isPending ? 'Confirming...' : 'Confirm Hold'}
          </Button>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-background px-5 py-2.5 border-b flex items-center justify-between gap-3 shadow-xs shrink-0">
        <span className="text-xs font-semibold text-stone-500">Manual Stage:</span>
        <Select value={request?.status || 'new'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40 h-8 text-xs font-medium border-stone-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New Inquiry</SelectItem>
            <SelectItem value="review">Staffing Review</SelectItem>
            <SelectItem value="waitlist">Waitlist</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="border-b overflow-x-auto custom-scrollbar">
          <TabsList className="inline-flex w-max min-w-full justify-start h-12 p-1 bg-transparent">
            <TabsTrigger value="summary" className="data-[state=active]:bg-muted">Summary</TabsTrigger>
            <TabsTrigger value="customer" className="data-[state=active]:bg-muted">Customer</TabsTrigger>
            <TabsTrigger value="preferences" className="data-[state=active]:bg-muted">Preferences</TabsTrigger>
            <TabsTrigger value="staffing" className="data-[state=active]:bg-muted">Staffing</TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-muted flex gap-1.5"><Sparkles className="h-3 w-3 text-amber-500"/> AI Match</TabsTrigger>
            <TabsTrigger value="comms" className="data-[state=active]:bg-muted">Comms</TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-muted">Files</TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-muted">Tasks</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-muted">History</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 p-5">
          <TabsContent value="summary" className="mt-0 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Request Number</p>
                <p className="text-sm font-medium">{request?.requestNumber || request?.id?.substring(0,8) || renderMissing('Request Number')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted Date</p>
                <p className="text-sm font-medium">{request?.created_at ? new Date(request.created_at).toLocaleString() : renderMissing('Submitted Date')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Service</p>
                <p className="text-sm font-medium">{request?.serviceName || request?.service?.name || renderMissing('Service')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Event Date</p>
                <p className="text-sm font-medium">{request?.eventDate || request?.event_date ? new Date(request.eventDate || request.event_date).toLocaleDateString() : renderMissing('Event Date')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget</p>
                <p className="text-sm font-medium">{request?.budget || request?.budget_cents ? `$${(request.budget || request.budget_cents / 100).toFixed(2)}` : renderMissing('Budget')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Attendees</p>
                <p className="text-sm font-medium">{request?.attendees || request?.number_of_guests || renderMissing('Attendees Count')}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="customer" className="mt-0 space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned Consultant</p>
                 <p className="text-sm font-medium">{request?.customer?.assigned_consultant?.name || renderMissing('Assigned Consultant')}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preferred Contact</p>
                 <p className="text-sm font-medium">{request?.customer?.preferred_contact_method || renderMissing('Preference')}</p>
               </div>
             </div>
             <div>
                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Customer Notes</p>
                 {request?.customer?.notes ? (
                   <p className="text-sm">{request.customer.notes}</p>
                 ) : renderMissing('Customer Notes')}
             </div>
          </TabsContent>
          
          <TabsContent value="preferences" className="mt-0 space-y-6">
             <div className="space-y-4">
                 <h3 className="text-sm font-semibold text-foreground border-b pb-2">Scheduling Preferences</h3>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preferred Date</p>
                     <p className="text-sm font-medium">{request?.preferred_date_1 || renderMissing('Preferred Date')}</p>
                   </div>
                   <div className="space-y-1">
                     <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preferred Time Window</p>
                     <p className="text-sm font-medium">{request?.preferred_window_1 || renderMissing('Preferred Window')}</p>
                   </div>
                   <div className="space-y-1">
                     <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alt Date</p>
                     <p className="text-sm font-medium">{request?.preferred_date_2 || 'None'}</p>
                   </div>
                   <div className="space-y-1">
                     <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alt Window</p>
                     <p className="text-sm font-medium">{request?.preferred_window_2 || 'None'}</p>
                   </div>
                 </div>
             </div>
          </TabsContent>

          <TabsContent value="staffing" className="mt-0 space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Eligible Employees</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {staff.length ? staff.map((e: any) => (
                  <Badge variant="secondary" key={e.id}>{e.name} ({e.role})</Badge>
                )) : renderMissing('Eligible Employees')}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="mt-0 space-y-6">
            <h3 className="font-semibold text-xs uppercase text-blue-600 dark:text-blue-400 tracking-wider">AI Assignment Recommendations</h3>
            {aiRecs.length > 0 ? (
              <div className="space-y-3">
                {aiRecs.map((rec: any, idx: number) => (
                  <Card key={rec.id} className={`overflow-hidden border transition-all ${idx === 0 ? 'border-blue-300 shadow-md ring-1 ring-blue-500/20 bg-blue-50/30' : 'opacity-80 hover:opacity-100'}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border bg-white">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                              {rec.employee?.first_name?.[0] || 'S'}{rec.employee?.last_name?.[0] || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm">{rec.employee?.first_name || 'Staff'} {rec.employee?.last_name || ''}</p>
                            <p className="text-xs text-muted-foreground">{rec.employee?.role || 'Consultant'}</p>
                          </div>
                        </div>
                        <Badge variant={idx === 0 ? "default" : "secondary"} className={idx === 0 ? "bg-blue-600" : ""}>
                          {rec.score}% Match
                        </Badge>
                      </div>
                      
                      <p className="text-xs font-semibold text-stone-700 mt-2">
                        Proposed: {rec.proposed_start_at ? new Date(rec.proposed_start_at).toLocaleString() : 'TBD'}
                      </p>
                      
                      {rec.disqualification_reasons_json && rec.disqualification_reasons_json.length > 0 && (
                        <div className="text-xs text-rose-600 mt-2 bg-rose-50 p-2 rounded-md">
                          Disqualifications: {rec.disqualification_reasons_json.join(', ')}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground mt-3 bg-muted/30 p-2 rounded-md">
                        {rec.score_breakdown_json ? JSON.stringify(rec.score_breakdown_json) : "Optimal matching score based on proximity and consultant schedule."}
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <Button 
                          size="xs" 
                          variant="outline" 
                          onClick={() => handleCreateHold(rec)}
                          disabled={createHoldMutation.isPending}
                        >
                          Create Hold
                        </Button>
                        <Button 
                          size="xs" 
                          onClick={() => handleDirectConfirm(rec)}
                          disabled={assignRequestMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Direct Confirm
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 border rounded-md border-dashed bg-muted/5">
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">No AI recommendations available</p>
                <p className="text-xs text-muted-foreground mt-1">This request has not been processed by the AI matching engine yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comms" className="mt-0 space-y-4 h-full flex flex-col min-h-[400px]">
             <div className="flex-1 border rounded-md p-4 bg-muted/10 flex items-center justify-center text-muted-foreground text-sm italic">
                {renderMissing('Communications Data')}
             </div>
          </TabsContent>

          <TabsContent value="files" className="mt-0 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Attached Files & Photos</h3>
              <Button size="sm" variant="outline">Upload</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <p className="text-xs text-muted-foreground col-span-2">{renderMissing('Files')}</p>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-0 space-y-4">
             <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Tasks</h3>
              <Button size="sm" variant="outline">Add Task</Button>
            </div>
            <p className="text-xs text-muted-foreground">{renderMissing('Tasks')}</p>
          </TabsContent>

          <TabsContent value="history" className="mt-0 space-y-4">
             <div className="relative border-l border-muted ml-3 space-y-6 pb-4">
                <div className="relative pl-6">
                  <div className="absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-background"></div>
                  <p className="text-sm font-medium">Request Created</p>
                  <p className="text-xs text-muted-foreground">{request?.created_at ? new Date(request.created_at).toLocaleString() : 'Unknown Date'}</p>
                </div>
             </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
