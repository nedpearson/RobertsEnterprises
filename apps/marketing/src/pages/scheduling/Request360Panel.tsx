import { DEFAULT_BOOKING_SETTINGS } from '@/lib/settings';
import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@vowos/design-system';
import { Button } from '@vowos/design-system';
import { Badge } from '@vowos/design-system';
import { ScrollArea } from '@vowos/design-system';
import { Avatar, AvatarFallback } from '@vowos/design-system';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@vowos/design-system';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@vowos/design-system';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@vowos/design-system';
import { Input, Textarea } from '@vowos/design-system';
import { 
  Phone, Mail, Clock, Calendar, User, FileText, CheckCircle, 
  MessageSquare, Play, AlertCircle, Sparkles, Lock, UserCheck, 
  Edit, Archive, Trash2, FileCode, ExternalLink, Database, Link,
  ChevronDown, MoreHorizontal, Plus, MapPin, Search, ChevronRight, Check
} from 'lucide-react';
import { 
  useAIRecommendations, useStaffProfiles, useCreateHold, 
  useConfirmBookingRequest, useTransitionRequestStatus, useAssignAppointmentRequest,
  useRequestNotes, useAddRequestNote, useAddRequestTask, useCustomerNotes, useAuditTrail, useRequestTasks,
  useActiveBusinessContext
} from '@/lib/services/schedulingService';
import { useVowosData } from '@/contexts/VowosDataContext';
import { resolveLocationSlug } from '@/data/vowosData';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import AppointmentCommunications from './components/AppointmentCommunications';



function EditableField({ value, onSave, label }: { value: string | null, onSave: (v: string) => void, label: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input 
          value={tempValue} 
          onChange={(e) => setTempValue(e.target.value)} 
          className="h-7 text-xs w-full"
          autoFocus
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { onSave(tempValue); setIsEditing(false); }}>
          <Check className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <span className="text-sm font-medium">{value || <span className="text-muted-foreground/60 italic text-xs">Missing {label}</span>}</span>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" 
        onClick={() => setIsEditing(true)}
      >
        <Edit className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function Request360Panel({ requestId, request, onClose, onEdit, onArchive, onDelete , onAssign}: { requestId?: string, request: any, onClose: () => void, onEdit?: (request: any) => void, onArchive?: (requestId: string) => void, onDelete?: (requestId: string) => void , onAssign?: (request: any) => void}) {
  const [activeSection, setActiveSection] = useState('overview');
  const [newNote, setNewNote] = useState('');
  
  const queryClient = useQueryClient();
  const reqId = requestId || request?.id;
  const { activeLocations } = useVowosData();
  const locSlug = resolveLocationSlug(request?.preferred_location_id || request?.location_id || request?.location);
  const locObj = activeLocations.find((l: any) => l.id === locSlug);
  const locationLabel = locObj ? locObj.short : (request?.location_name || 'Location Review Required');

  const { businessId = 'b0000000-0000-0000-0000-000000000000' } = useActiveBusinessContext();
  const { data: staff = [] } = useStaffProfiles();
  const { data: aiRecs = [] } = useAIRecommendations(reqId);
  const { data: reqNotes = [] } = useRequestNotes(reqId, request?.appointment_id);
  const { data: customerNotes = [] } = useCustomerNotes(request?.customer_id);
  const { data: auditTrail = [] } = useAuditTrail(reqId);
  
  // Use appointment_id if available, otherwise fallback to reqId
  const appointmentIdForTasks = request?.appointment_id || reqId;
  const { data: tasks = [] } = useRequestTasks(appointmentIdForTasks);
  
  const addNoteMutation = useAddRequestNote();
  const addTaskMutation = useAddRequestTask();
  const [newTask, setNewTask] = useState('');
  const [showTaskInput, setShowTaskInput] = useState(false);
  const createHoldMutation = useCreateHold();
  const confirmBookingMutation = useConfirmBookingRequest();
  const transitionStatusMutation = useTransitionRequestStatus();
  const assignRequestMutation = useAssignAppointmentRequest();

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [preflightMissing, setPreflightMissing] = useState<string[]>([]);

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

  const parsedNotes = useMemo(() => {
    if (!request?.notes) return {};
    const match = request.notes.match(/Form Data:\s*([\s\S]+)/);
    if (!match) return {};
    try {
      const raw = JSON.parse(match[1]);
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(raw)) {
        const cleanKey = k.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').replace(/\*/g, '').trim();
        clean[cleanKey] = v;
        clean[k] = v;
      }
      return clean;
    } catch {
      return {};
    }
  }, [request?.notes]);

  if (!request && !reqId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-8 text-center bg-background">
        Select a request from the queue to view the 360Â° details.
      </div>
    );
  }

  const customerName = request?.customerName || 
                       request?.customer?.name || 
                       (request?.customer?.first_name ? `${request.customer.first_name || ''} ${request.customer.last_name || ''}`.trim() : null) || 
                       parsedNotes['First and Last Name'] || 
                       parsedNotes['First + Last Name'] || 
                       parsedNotes['First Name'] || 
                       null;

  const customerPhone = request?.customerPhone || request?.customer?.phone || parsedNotes['Contact Phone'] || parsedNotes['Phone'] || null;
  const customerEmail = request?.customerEmail || request?.customer?.email || parsedNotes['Email'] || null;
  const drinkRec = parsedNotes.beverageSelection || parsedNotes['Drink Preference'] || parsedNotes.beverage || request?.metadata_json?.beverageSelection || request?.metadata_json?.beverage || null;
  const fittingSuite = parsedNotes['Fitting Suite'] || parsedNotes['Preferred Suite'] || request?.metadata_json?.fittingSuite || null;
  const initials = customerName ? customerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '?';
  const status = (request?.status || 'PENDING').toUpperCase();

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

  
  const handleAddTask = async () => {
    if (!newTask.trim() || !reqId) return;
    try {
      await addTaskMutation.mutateAsync({
        requestId: reqId,
        title: newTask,
        businessId: businessId
      });
      setNewTask('');
      setShowTaskInput(false);
      toast.success('Task added successfully');
    } catch (err: any) {
      toast.error('Failed to add task: ' + err.message);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !reqId) return;
    try {
      await addNoteMutation.mutateAsync({
        requestId: reqId,
        content: newNote,
        businessId: businessId,
        authorId: '00000000-0000-0000-0000-000000000000'
      });
      setNewNote('');
      toast.success('Note added successfully');
    } catch (err: any) {
      toast.error('Failed to add note: ' + err.message);
    }
  };

  const handleConfirmClick = () => {
    const missing: string[] = [];
    
    if (!request?.customer_id) {
      missing.push('Select or create a customer profile');
    }
    
    const realLocationId = locObj?.id || request?.location_id || request?.preferred_location_id;
    if (!realLocationId || realLocationId === 'Main Store' || realLocationId === 'Main Boutique') {
      missing.push('Select a specific store location');
    }

    if (!request?.assigned_employee_id) {
      missing.push('Assign a stylist');
    }

    const startAt = request?.requested_start_at || request?.preferred_date_1;
    if (!startAt) {
      missing.push('Select a valid date and time');
    }

    setPreflightMissing(missing);
    setIsConfirmDialogOpen(true);
  };

  const executeConfirm = async (sendEmail: boolean, sendSms: boolean) => {
    if (preflightMissing.length > 0 || !reqId) return;
    
    const realLocationId = locObj?.id || request?.location_id || request?.preferred_location_id;
    
    try {
      await confirmBookingMutation.mutateAsync({
        requestId: reqId as string,
        businessId: businessId as string,
        locationId: (realLocationId as string) || '',
        stylistId: (request?.assigned_employee_id as string) || null,
        startAt: (request?.requested_start_at || request?.preferred_date_1 || '') as string,
        durationMinutes: Number(request?.duration_minutes) || 90,
        sendEmail,
        sendSms,
        userId: '00000000-0000-0000-0000-000000000000'
      });
      toast.success('Appointment confirmed successfully!');
      setIsConfirmDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
    } catch (err: any) {
      toast.error('Failed to confirm appointment: ' + err.message);
    }
  };
  const renderMissing = (label: string, onClick?: () => void) => (
    <Button variant="ghost" size="sm" onClick={onClick} className="h-6 px-2 text-xs text-brand-primary bg-brand-soft/50 hover:bg-brand-soft hover:text-brand-primary">
      <Plus className="h-3 w-3 mr-1" /> Add {label}
    </Button>
  );

  return (
    <div className="h-full flex flex-col border-l bg-background">
      {/* Header */}
      <div className="relative overflow-hidden border-b bg-gradient-to-br from-rose-50/60 via-amber-50/40 to-stone-50 dark:from-stone-900 dark:via-rose-950/20 dark:to-stone-950">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 via-amber-400 to-rose-500"></div>
        <div className="p-4 sm:p-5 pt-5 flex justify-between items-start z-10 gap-2">
          <div className="flex gap-3 sm:gap-4 items-center flex-1 min-w-0">
            <Avatar className="h-11 w-11 sm:h-14 sm:w-14 border-2 border-amber-200 shadow-md ring-1 ring-amber-400/20 bg-white shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-rose-500 to-amber-600 text-white text-base sm:text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-base sm:text-xl font-bold text-stone-900 truncate">{customerName || 'Missing Customer Identity'}</h2>
                <Badge className={
                  status === 'PENDING' || status === 'NEW' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                  status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                  'bg-stone-100 text-stone-700 border-stone-300'
                } variant="outline">
                  {status}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-rose-500" /> {customerPhone || 'Missing Phone'}</span>
                <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 text-rose-500" /> {customerEmail || 'Missing Email'}</span>
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-rose-100/50 shrink-0 text-stone-600 text-lg h-8 w-8">
              &times;
            </Button>
            <div className="flex gap-1.5">
              <Button size="sm" variant="default" className="h-7 text-xs bg-brand-primary text-white" onClick={() => onAssign?.(request)}>Assign Stylist</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setActiveSection('activity')}>Add Note</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" onClick={handleConfirmClick}>Confirm</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Vertical Nav */}
        <div className="w-[140px] sm:w-[160px] border-r bg-muted/20 flex flex-col gap-1 p-2 shrink-0">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'customer', label: 'Customer', icon: User },
            { id: 'schedule', label: 'Schedule', icon: Calendar },
            { id: 'communication', label: 'Communication', icon: MessageSquare },
            { id: 'activity', label: 'Activity', icon: Clock }
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left ${activeSection === section.id ? 'bg-background shadow-sm border font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
            >
              <section.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{section.label}</span>
            </button>
          ))}
          
          <div className="mt-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground text-left">
                  <span className="flex items-center gap-2"><MoreHorizontal className="h-4 w-4" /> <span className="hidden sm:inline">More</span></span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveSection('source')}><Database className="h-4 w-4 mr-2"/> Source Trace</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveSection('raw')}><FileCode className="h-4 w-4 mr-2"/> Raw Form Data</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1 p-5">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Request Number</p>
                  <p className="text-sm font-medium">{request?.requestNumber || request?.id?.substring(0,8) || renderMissing('Number')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Store Location</p>
                  <p className="text-sm font-medium">{locationLabel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Service</p>
                  <p className="text-sm font-medium">{request?.type || parsedNotes['Service'] || 'Bridal Appointment'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Looking For</p>
                  <p className="text-sm font-medium">{request?.looking_for || parsedNotes['Looking For'] || 'Wedding Dress'}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Requested Time</p>
                  <p className="text-sm font-medium">{request?.preferred_date_1 ? `${request.preferred_date_1} ${request.preferred_window_1 || ''}` : 'Flexible'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmed Time</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-amber-600">Not yet confirmed</p>
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={handleConfirmClick}>Confirm</Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned Stylist</p>
                  <div className="flex items-center gap-2">
                    {aiRecs.length > 0 ? (
                      <>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200"><Sparkles className="h-3 w-3 mr-1" /> {aiRecs[0].employee?.first_name} {aiRecs[0].employee?.last_name}</Badge>
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-blue-700">Accept</Button>
                      </>
                    ) : (
                      renderMissing('Stylist', () => onAssign?.(request))
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</p>
                  <Select value={request?.status || 'submitted'} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full h-8 text-xs font-medium border-stone-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="new">New Inquiry</SelectItem>
                      <SelectItem value="review">Staffing Review</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="waitlist">Waitlist</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Event Date</p>
                  <p className="text-sm font-medium">{request?.eventDate || request?.event_date || request?.customer?.wedding_date || parsedNotes['Occasion Date'] || parsedNotes['Wedding Date'] || parsedNotes['First Appointment Request'] || parsedNotes['Appointment Date'] ? new Date(request.eventDate || request.event_date || request.customer?.wedding_date || parsedNotes['Occasion Date'] || parsedNotes['Wedding Date'] || parsedNotes['First Appointment Request'] || parsedNotes['Appointment Date']).toLocaleDateString() : 'Flexible / TBD'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget</p>
                  <p className="text-sm font-medium">
                    {parsedNotes['Wedding Dress Budget'] || 
                     parsedNotes['Price Point'] || 
                     parsedNotes['Budget'] || 
                     parsedNotes['price_point'] || 
                     (request?.budget && String(request.budget) !== '0' ? `$${request.budget}` : null) || 
                     (request?.budget_cents && request.budget_cents > 0 ? `$${(request.budget_cents / 100).toFixed(2)}` : null) || 
                     '$2,000 - $4,000 (Standard)'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Attendees</p>
                  <p className="text-sm font-medium">{request?.attendees || request?.number_of_guests || parsedNotes['Number In Party'] || '1 Bride + Guests'}</p>
                </div>
              </div>
              
              {reqNotes.length > 0 && (
                <div className="bg-muted/30 p-3 rounded-md border border-muted mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Latest Note</p>
                  <p className="text-sm line-clamp-2">{reqNotes[0].content}</p>
                  <button onClick={() => setActiveSection('activity')} className="text-xs text-brand-primary mt-1 hover:underline">View all</button>
                </div>
              )}
            </div>
          )}

          {activeSection === 'customer' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">First Name</p>
                  <EditableField label="First Name" value={request?.customer?.first_name || customerName?.split(' ')[0]} onSave={() => {}} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Name</p>
                  <EditableField label="Last Name" value={request?.customer?.last_name || customerName?.split(' ').slice(1).join(' ')} onSave={() => {}} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                  <EditableField label="Email" value={customerEmail} onSave={() => {}} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</p>
                  <EditableField label="Phone" value={customerPhone} onSave={() => {}} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preferred Contact</p>
                  <EditableField label="Contact Method" value={request?.customer?.preferred_contact_method} onSave={() => {}} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Wedding Date</p>
                  <EditableField label="Wedding Date" value={request?.eventDate || parsedNotes['Wedding Date']} onSave={() => {}} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget</p>
                  <EditableField label="Budget" value={request?.budget ? `$${request.budget}` : null} onSave={() => {}} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Party Size</p>
                  <EditableField label="Party Size" value={request?.attendees} onSave={() => {}} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Referral Source</p>
                  <EditableField label="Source" value={parsedNotes['How did you hear about us?']} onSave={() => {}} />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold">Appointment Preferences</h3>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-brand-primary"><Plus className="h-3 w-3 mr-1" /> Add</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">Dress Style</p>
                    {parsedNotes['Dress Style'] || <span className="text-muted-foreground/60 italic text-xs">None provided</span>}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">Designer Interests</p>
                    {parsedNotes['Designers'] || <span className="text-muted-foreground/60 italic text-xs">None provided</span>}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold">Internal Customer Notes</h3>
                  <Button size="sm" variant="outline" className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Add Note</Button>
                </div>
                {customerNotes.length > 0 ? (
                  <div className="space-y-3">
                    {customerNotes.map((note: any) => (
                      <div key={note.id} className="bg-stone-50 p-3 rounded-md border text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-xs text-stone-700">{note.author?.email || 'Staff'}</span>
                          <span className="text-[10px] text-stone-500">{new Date(note.created_at).toLocaleDateString()}</span>
                        </div>
                        <p>{note.is_pinned && 'ðŸ“Œ '}{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No internal notes for this customer yet.</p>
                )}
              </div>
            </div>
          )}

          {activeSection === 'schedule' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Requested Date/Time</p>
                  <p className="text-sm font-medium">{request?.preferred_date_1 ? `${request.preferred_date_1} ${request.preferred_window_1 || ''}` : 'Flexible'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmed Date/Time</p>
                  <p className="text-sm font-medium text-muted-foreground italic">Not yet confirmed</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned Stylist</p>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    Unassigned <Button size="sm" variant="link" className="h-5 p-0 text-xs" onClick={() => onAssign?.(request)}>Assign</Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</p>
                  <p className="text-sm font-medium flex items-center gap-2">90 min <Edit className="h-3 w-3 text-muted-foreground cursor-pointer" /></p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suite / Room</p>
                  <p className="text-sm font-medium">{renderMissing('Suite')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</p>
                  <p className="text-sm font-medium">{locationLabel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Buffer Required</p>
                  <p className="text-sm font-medium">15 min</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Waitlist</p>
                  <p className="text-sm font-medium">No</p>
                </div>
              </div>
              <div className="pt-4 border-t flex gap-2">
                <Button variant="default" className="bg-brand-primary" onClick={() => onAssign?.(request)}>Assign Stylist</Button>
                <Button variant="outline">Move Appointment</Button>
                <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">Cancel Appointment</Button>
              </div>
            </div>
          )}

          {activeSection === 'communication' && (
            <div className="h-full min-h-[400px]">
              {request?.customer_id ? (
                <AppointmentCommunications 
                  customerId={request.customer_id}
                  customerPhone={customerPhone}
                  customerEmail={customerEmail}
                  businessId={request.business_id}
                />
              ) : (
                <div className="flex-1 border rounded-md p-4 bg-muted/10 flex items-center justify-center text-muted-foreground text-sm italic">
                  {renderMissing('Customer ID to show Communications')}
                </div>
              )}
            </div>
          )}

          {activeSection === 'activity' && (
            <div className="space-y-6">
              <div className="bg-stone-50 p-4 rounded-md border border-stone-200 space-y-3">
                <Textarea 
                  placeholder="Add a note to this request..." 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px] bg-white text-sm"
                />
                <div className="flex justify-between items-center">
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setShowTaskInput(true)}><CheckCircle className="h-4 w-4 mr-1" /> Add Task</Button>
                  <Button size="sm" className="h-8 bg-brand-primary" onClick={handleAddNote}>Post Note</Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Timeline</h3>
                <div className="relative border-l border-muted ml-3 space-y-6 pb-4">
                  {[...reqNotes.map(n => ({ type: 'note', date: new Date(n.created_at), data: n })),
                    ...auditTrail.map(a => ({ type: 'audit', date: new Date(a.created_at), data: a })),
                    ...tasks.map(t => ({ type: 'task', date: new Date(t.created_at), data: t }))
                  ].sort((a, b) => b.date.getTime() - a.date.getTime()).map((item, idx) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full bg-stone-300 ring-4 ring-background"></div>
                      {item.type === 'note' && (
                        <div>
                          <p className="text-sm font-medium">Note added by {item.data.author?.email || 'Staff'}</p>
                          <p className="text-xs text-muted-foreground">{item.date.toLocaleString()}</p>
                          <p className="text-sm mt-1 bg-stone-50 p-2 rounded border">{item.data.content}</p>
                        </div>
                      )}
                      {item.type === 'audit' && (
                        <div>
                          <p className="text-sm font-medium">Event: {item.data.event_type}</p>
                          <p className="text-xs text-muted-foreground">{item.date.toLocaleString()}</p>
                        </div>
                      )}
                      {item.type === 'task' && (
                        <div>
                          <p className="text-sm font-medium">Task: {item.data.title}</p>
                          <p className="text-xs text-muted-foreground">Due: {item.data.due_date ? new Date(item.data.due_date).toLocaleDateString() : 'None'} â€¢ Status: {item.data.status}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="relative pl-6">
                    <div className="absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full bg-status-info ring-4 ring-background"></div>
                    <p className="text-sm font-medium">Request Created</p>
                    <p className="text-xs text-muted-foreground">{request?.created_at ? new Date(request.created_at).toLocaleString() : 'Unknown Date'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'source' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-4">
                <Database className="h-4 w-4 text-indigo-600" /> Intake Source Trace
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 bg-stone-50 p-3 rounded border border-stone-200">
                  <p className="text-stone-500 uppercase tracking-wider font-semibold text-[10px]">Ingestion Request ID</p>
                  <p className="font-mono font-bold text-stone-800 text-xs">{request?.id}</p>
                </div>
                <div className="space-y-1 bg-stone-50 p-3 rounded border border-stone-200">
                  <p className="text-stone-500 uppercase tracking-wider font-semibold text-[10px]">Source Store Domain</p>
                  <p className="font-mono font-bold text-indigo-700 text-xs flex items-center gap-1">
                    {parsedNotes['Store Location']?.includes('Proper') ? 'properandcompany.com' : 'idobridalcouture.com'}
                  </p>
                </div>
                <div className="space-y-1 bg-stone-50 p-3 rounded border border-stone-200">
                  <p className="text-stone-500 uppercase tracking-wider font-semibold text-[10px]">Customer Entity ID</p>
                  <p className="font-mono text-stone-800 text-xs">{request?.customer_id || 'Unlinked'}</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'raw' && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-4">
                <FileCode className="h-4 w-4 text-stone-600" /> Raw Form Data
              </h3>
              <pre className="bg-stone-900 text-emerald-400 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-stone-800 max-h-[500px] leading-relaxed">
                {request?.notes ? (
                  request.notes.includes('Form Data:') ? request.notes : JSON.stringify({ raw_notes: request.notes }, null, 2)
                ) : JSON.stringify({ status: 'No raw notes attached' }, null, 2)}
              </pre>
            </div>
          )}

        </ScrollArea>
      </div>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{preflightMissing.length > 0 ? 'Complete Appointment Requirements' : 'Confirmation Review'}</DialogTitle>
            <DialogDescription>
              {preflightMissing.length > 0 
                ? 'The following information is missing and must be completed before confirming this appointment:' 
                : 'Review the final details before sending confirmation to the customer.'}
            </DialogDescription>
          </DialogHeader>
          
          {preflightMissing.length > 0 ? (
            <div className="space-y-4 py-4">
              <ul className="space-y-2">
                {preflightMissing.map((missingItem, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" /> {missingItem}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-4 py-4 text-sm">
               <div className="grid grid-cols-2 gap-4">
                 <div className="text-muted-foreground">Customer:</div>
                 <div className="font-medium">{customerName}</div>
                 
                 <div className="text-muted-foreground">Location:</div>
                 <div className="font-medium">{locationLabel}</div>
                 
                 <div className="text-muted-foreground">Date & Time:</div>
                 <div className="font-medium">{request?.requested_start_at || request?.preferred_date_1}</div>
                 
                 <div className="text-muted-foreground">Stylist:</div>
                 <div className="font-medium">
                   {request?.assigned_employee_id 
                     ? staff.find((s: any) => s.id === request.assigned_employee_id)?.first_name + ' ' + staff.find((s: any) => s.id === request.assigned_employee_id)?.last_name 
                     : 'Assigned Stylist'}
                 </div>
               </div>
            </div>
          )}

          <DialogFooter>
            {preflightMissing.length > 0 ? (
              <>
                <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => { setIsConfirmDialogOpen(false); setActiveSection('schedule'); }}>Fix Now</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => executeConfirm(false, false)} disabled={confirmBookingMutation.isPending}>Confirm Without Sending</Button>
                <Button onClick={() => executeConfirm(true, true)} disabled={confirmBookingMutation.isPending}>
                  {confirmBookingMutation.isPending ? 'Confirming...' : 'Confirm and Send'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

