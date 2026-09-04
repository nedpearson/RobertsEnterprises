import React, { useState, useMemo, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@vowos/design-system';
import { 
  CalendarDays, 
  Inbox, 
  Users, 
  Sparkles, 
  BarChart3, 
  Plus, 
  Check, 
  X, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  UserCheck, 
  Zap, 
  RefreshCw, 
  SlidersHorizontal,
  ChevronRight,
  UserPlus,
  Edit,
  Archive,
  Trash2,
  Phone,
  Mail,
  Wine,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import { Appointment360Panel } from './Appointment360Panel';
import { Request360Panel } from './Request360Panel';
import { AIAssignmentDrawer } from './AIAssignmentDrawer';
import { NewAppointmentModal } from './NewAppointmentModal';
import { NewRequestModal } from './NewRequestModal';
import { EditRequestModal } from './EditRequestModal';
import { EmployeeShiftModal } from './EmployeeShiftModal';
import { DraggableAppointmentCard } from './components/DraggableAppointmentCard';
import { NotificationPermissionToggle } from '@/components/vowos/NotificationPermissionToggle';
import { useVowosData } from '@/contexts/VowosDataContext';
import { 
  useBusiness, 
  useAppointmentRequests, 
  useAppointments, 
  useEmployeeSchedules,
  useStaffProfiles,
  useAssignAppointmentRequest,
  useRescheduleAppointment,
  usePublishSchedules,
  useFetchTimeOffRequests,
  useAppointmentRequestSummary,
  bulkUpdateAppointmentRequests,
} from '@/lib/services/schedulingService';
import {
  AppointmentRequestBulkAction,
  AppointmentRequestArchiveScope,
  AppointmentRequestStatusFilter,
  getAppointmentRequestOutcome,
  getMatchingAppointmentRequestCount,
  getArchiveCutoffIso,
  isArchivedAppointmentRequestStatus,
} from '@/lib/services/bookingRequestBulk';
import { WorkforceMatrix } from './components/WorkforceMatrix';
import { useCapacityMetrics } from '@/lib/services/capacityService';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export type SchedulingMode = 'calendar' | 'requests' | 'workforce' | 'ai' | 'capacity';

interface UnifiedSchedulingWorkspaceProps {
  /** Mode used when the URL has no valid ?mode= — lets the Booking Requests tab open on the requests queue. */
  defaultMode?: SchedulingMode;
  hideInnerTopBar?: boolean;
}

const BULK_ACTION_COPY: Record<AppointmentRequestBulkAction, { title: string; description: string; confirmLabel: string }> = {
  archive: {
    title: 'Archive selected requests?',
    description: 'The selected requests will leave the active queue and remain available in Archived.',
    confirmLabel: 'Archive requests',
  },
  sold_archive: {
    title: 'Mark selected requests sold?',
    description: 'The selected requests will be recorded as sold and moved to Archived.',
    confirmLabel: 'Mark sold & archive',
  },
  unsold_archive: {
    title: 'Mark selected requests unsold?',
    description: 'The selected requests will be recorded as unsold and moved to Archived.',
    confirmLabel: 'Mark unsold & archive',
  },
  restore: {
    title: 'Restore selected requests?',
    description: 'The selected requests will return to the active queue with Submitted status.',
    confirmLabel: 'Restore requests',
  },
  delete: {
    title: 'Permanently delete selected archives?',
    description: 'This cannot be undone. Related request history may also be removed. Type DELETE to continue.',
    confirmLabel: 'Delete permanently',
  },
};

export function UnifiedSchedulingWorkspace({ defaultMode = 'calendar', hideInnerTopBar = false }: UnifiedSchedulingWorkspaceProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMode = searchParams.get('mode') as SchedulingMode | null;
  const activeMode: SchedulingMode = ['calendar', 'requests', 'workforce', 'ai', 'capacity'].includes(rawMode || '')
    ? (rawMode as SchedulingMode)
    : defaultMode;

  const appointmentIdFromUrl = searchParams.get('appointmentId') || searchParams.get('appointment') || searchParams.get('request');

  const [selectedRequest, setSelectedRequest] = useState<Record<string, any> | null>(null);
  const [assigningRequest, setAssigningRequest] = useState<Record<string, any> | null>(null);
  
  const { mutate: assignRequest } = useAssignAppointmentRequest();
  const rescheduleMutation = useRescheduleAppointment();

  const [newAppointmentData, setNewAppointmentData] = useState<{ start_at: string; employee_id: string } | null>(null);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [shiftModalData, setShiftModalData] = useState<{ isOpen: boolean; data: any }>({ isOpen: false, data: null });

  // Layer Toggles for Calendar Mode
  const [layerFilters, setLayerFilters] = useState({
    appointments: true,
    requests: true,
    shifts: true,
    holds: true,
    rooms: true,
  });

  // Selected Employee filter for Workforce mode
  const [selectedWorkforceStaff, setSelectedWorkforceStaff] = useState<string>('all');

  const queryClient = useQueryClient();
  const queueRef = useRef<HTMLDivElement>(null);
  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [requestView, setRequestView] = useState<'active' | 'archived'>('active');
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<AppointmentRequestBulkAction | null>(null);
  const [bulkConfirmText, setBulkConfirmText] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isArchiveOlderOpen, setIsArchiveOlderOpen] = useState(false);
  const [archiveAgeDays, setArchiveAgeDays] = useState('90');
  const [archiveOlderOutcome, setArchiveOlderOutcome] = useState<'archive' | 'sold_archive' | 'unsold_archive'>('archive');



  const parseNotes = (notesStr: string) => {
    if (!notesStr) return {};
    const match = notesStr.match(/Form Data:\s*([\s\S]+)/);
    if (!match) return {};
    try {
      const raw = JSON.parse(match[1]);
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(raw)) {
        const cleanKey = k.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').replace(/\*/g, '').trim();
        clean[cleanKey] = v;
      }
      return clean;
    } catch {
      return {};
    }
  };

  const handleArchiveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.from('appointment_requests').update({ status: 'archived' }).eq('id', requestId);
      if (error) throw error;
      toast.success('Appointment request archived');
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
      if (selectedRequest?.id === requestId) {
        updateSelectedRequestUrl(null);
      }
    } catch (err: any) {
      toast.error('Failed to archive request: ' + err.message);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this appointment request?')) return;
    try {
      const { error } = await supabase.from('appointment_requests').delete().eq('id', requestId);
      if (error) throw error;
      toast.success('Appointment request deleted permanently');
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
      if (selectedRequest?.id === requestId) {
        updateSelectedRequestUrl(null);
      }
    } catch (err: any) {
      toast.error('Failed to delete request: ' + err.message);
    }
  };

  const { selectedLocationIds, activeLocation } = useVowosData();
  const { data: business } = useBusiness();
  const businessId = business?.id;

  const bulkLocationScope = useMemo(() => {
    if (storeFilter === 'all') return selectedLocationIds;
    const locationPrefix = storeFilter === 'proper' ? 'pc-' : 'ido-';
    return selectedLocationIds.filter((locationId) => locationId.startsWith(locationPrefix));
  }, [selectedLocationIds, storeFilter]);

  const summaryLocationScope = storeFilter === 'all' || bulkLocationScope.length > 0
    ? bulkLocationScope
    : 'all';

  const requestArchiveScope: AppointmentRequestArchiveScope = activeMode === 'requests' ? requestView : 'active';
  const requestQuery = useAppointmentRequests(businessId, selectedLocationIds, requestArchiveScope);
  const requestSummaryQuery = useAppointmentRequestSummary(businessId, summaryLocationScope);
  const requestSummary = storeFilter !== 'all' && bulkLocationScope.length === 0
    ? undefined
    : requestSummaryQuery.data;
  const activeRequestCount = requestSummary?.active ?? 0;
  const archivedRequestCount = requestSummary?.archived ?? 0;
  const newRequestCount = requestSummary?.new ?? 0;
  const soldArchivedCount = requestSummary?.soldArchived ?? 0;
  const unsoldArchivedCount = requestSummary?.unsoldArchived ?? 0;
  const unclassifiedArchivedCount = requestSummary?.unclassifiedArchived ?? 0;
  const requestLoadError = requestQuery.error || requestSummaryQuery.error;
  const requests = useMemo(() => {
    return (requestQuery.data || []).map((r: any) => ({
      ...r,
      status: r.status || 'submitted',
    }));
  }, [requestQuery.data]);
  const { data: appointments = [] } = useAppointments(businessId, selectedLocationIds);
  const { data: schedules = [] } = useEmployeeSchedules(businessId, selectedLocationIds);
  const { data: staff = [] } = useStaffProfiles();
  const { data: timeOffRequests = [] } = useFetchTimeOffRequests(businessId);

  const todayStr = new Date().toISOString().split('T')[0];
  const { data: capacityMetrics } = useCapacityMetrics(businessId, todayStr);

  const unarchivedRequests = useMemo(() => {
    return requests.filter((r) => !isArchivedAppointmentRequestStatus(r.status) && r.status !== 'deleted');
  }, [requests]);

  const displayRequests = useMemo(() => {
    const scopedRequests = requestView === 'archived'
      ? requests.filter((r) => isArchivedAppointmentRequestStatus(r.status))
      : unarchivedRequests;

    return scopedRequests
      .filter((r: any) => {
        if (storeFilter === 'all') return true;
        const notes = (r.notes || '').toLowerCase();
        const loc = (r.location_name || r.preferred_location_id || '').toLowerCase();
        if (storeFilter === 'proper') return notes.includes('proper') || loc.includes('proper') || loc.includes('pc');
        if (storeFilter === 'ido') return notes.includes('i do bridal') || notes.includes('idobridal') || loc.includes('ido') || loc.includes('br');
        return true;
      })
      .filter((r: any) => {
        if (statusFilter === 'all') return true;
        if (requestView === 'archived') {
          if (statusFilter === 'sold') return getAppointmentRequestOutcome(r.status) === 'sold';
          if (statusFilter === 'unsold') return getAppointmentRequestOutcome(r.status) === 'unsold';
          if (statusFilter === 'unclassified') return getAppointmentRequestOutcome(r.status) === null;
          return true;
        }
        if (statusFilter === 'new') return !r.status || r.status === 'new' || r.status === 'submitted' || r.status === 'open' || r.status === 'received';
        if (statusFilter === 'review') return r.status === 'review' || r.status === 'staffing_review';
        if (statusFilter === 'ai_ready') return r.status === 'ai_ready' || r.status === 'recommended';
        if (statusFilter === 'pending') return r.status === 'tentative_hold' || r.status === 'confirmation_pending' || r.status === 'pending' || r.status === 'hold';
        if (statusFilter === 'waitlist') return r.status === 'waitlist';
        return true;
      });
  }, [requestView, requests, unarchivedRequests, storeFilter, statusFilter]);

  const matchingRequestCount = getMatchingAppointmentRequestCount(
    requestSummary,
    requestView,
    statusFilter as AppointmentRequestStatusFilter,
  );

  const selectedRequestCount = selectAllMatching ? matchingRequestCount : selectedRequestIds.size;

  useEffect(() => {
    setSelectedRequestIds(new Set());
    setSelectAllMatching(false);
  }, [requestView, statusFilter, storeFilter, selectedLocationIds]);

  const toggleRequestSelection = (requestId: string) => {
    if (selectAllMatching) return;
    setSelectedRequestIds((current) => {
      const next = new Set(current);
      if (next.has(requestId)) next.delete(requestId);
      else next.add(requestId);
      return next;
    });
  };

  const toggleSelectAllMatching = () => {
    setSelectedRequestIds(new Set());
    setSelectAllMatching((current) => !current);
  };

  const changeRequestView = (view: 'active' | 'archived') => {
    setRequestView(view);
    setStatusFilter('all');
  };

  const runSelectedBulkAction = async () => {
    if (!businessId || !pendingBulkAction || selectedRequestCount === 0) return;
    if (pendingBulkAction === 'delete' && (selectAllMatching || bulkConfirmText !== 'DELETE')) return;
    if (storeFilter !== 'all' && bulkLocationScope.length === 0) {
      toast.error('The current location scope does not include the selected boutique.');
      return;
    }

    setIsBulkUpdating(true);
    try {
      const affected = await bulkUpdateAppointmentRequests({
        businessId,
        action: pendingBulkAction,
        requestIds: selectAllMatching ? undefined : [...selectedRequestIds],
        selectAllMatching,
        statusFilter: statusFilter as AppointmentRequestStatusFilter,
        locationId: bulkLocationScope,
      });

      const pastTense: Record<AppointmentRequestBulkAction, string> = {
        archive: 'archived',
        sold_archive: 'marked sold and archived',
        unsold_archive: 'marked unsold and archived',
        restore: 'restored',
        delete: 'permanently deleted',
      };
      toast.success(`${affected} booking request${affected === 1 ? '' : 's'} ${pastTense[pendingBulkAction]}.`);
      if (selectedRequest?.id && (selectAllMatching || selectedRequestIds.has(selectedRequest.id))) updateSelectedRequestUrl(null);
      setSelectedRequestIds(new Set());
      setSelectAllMatching(false);
      setPendingBulkAction(null);
      setBulkConfirmText('');
      await queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
    } catch (err: unknown) {
      toast.error('Bulk request update failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const archiveOlderRequests = async () => {
    if (!businessId) return;
    if (storeFilter !== 'all' && bulkLocationScope.length === 0) {
      toast.error('The current location scope does not include the selected boutique.');
      return;
    }

    setIsBulkUpdating(true);
    try {
      const affected = await bulkUpdateAppointmentRequests({
        businessId,
        action: archiveOlderOutcome,
        submittedBefore: getArchiveCutoffIso(Number(archiveAgeDays)),
        locationId: bulkLocationScope,
      });
      toast.success(`${affected} older booking request${affected === 1 ? '' : 's'} archived.`);
      setIsArchiveOlderOpen(false);
      setSelectedRequestIds(new Set());
      setSelectAllMatching(false);
      await queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
    } catch (err: unknown) {
      toast.error('Could not archive older requests: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Mode Switcher handler
  const setMode = (mode: SchedulingMode) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('mode', mode);
    setSearchParams(nextParams);
  };

  // Sync URL query params to selected record
  useEffect(() => {
    if (appointmentIdFromUrl) {
      const apt = appointments.find((a: any) => a.id === appointmentIdFromUrl);
      if (apt) {
        setSelectedRequest({
          type: 'appointment',
          id: apt.id,
          customerName: apt.customer ? `${apt.customer.first_name || ''} ${apt.customer.last_name || ''}`.trim() : null,
          serviceName: apt.service?.name || null,
          status: apt.confirmation_status || 'confirmed',
          time: `${new Date(apt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(apt.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          employeeName: apt.employee ? `${apt.employee.first_name || ''} ${apt.employee.last_name || ''}`.trim() : null,
          roomName: apt.room?.name || null,
          raw: apt
        });
        return;
      }

      const req = requests.find((r: any) => r.id === appointmentIdFromUrl);
      if (req) {
        setSelectedRequest({
          type: 'request',
          id: req.id,
          customerName: req.customer ? `${req.customer.first_name || ''} ${req.customer.last_name || ''}`.trim() : null,
          serviceName: req.service?.name || null,
          status: req.status || 'new',
          time: req.preferred_date_1 || null,
          employeeName: null,
          roomName: null,
          raw: req
        });
        return;
      }
    }
  }, [appointmentIdFromUrl, appointments, requests]);

  // Real-time synchronization.
  // The channel topic MUST be unique per mount: supabase-js returns the existing
  // channel instance for a repeated topic, and calling .on('postgres_changes')
  // on an already-subscribed channel throws
  // "cannot add `postgres_changes` callbacks ... after `subscribe()`".
  // This component mounts from several tabs (Appointments Overview/Calendar/
  // Appointments, Team > Scheduling), so a remount or overlapping mount with a
  // shared topic crashed the whole workspace.
  useEffect(() => {
    const channel = supabase
      .channel(`unified-scheduling-sync-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointment_holds' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['activeHolds'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointment_requests' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const updateSelectedRequestUrl = (req: Record<string, any> | null) => {
    setSelectedRequest(req);
    const nextParams = new URLSearchParams(searchParams);
    if (req?.id) {
      nextParams.set('appointmentId', req.id);
    } else {
      nextParams.delete('appointmentId');
      nextParams.delete('appointment');
      nextParams.delete('request');
    }
    setSearchParams(nextParams);
  };

  // Map events for FullCalendar
  const calendarEvents = useMemo(() => {
    const events: Record<string, any>[] = [];

    // Add employee shift background blocks if layer enabled
    if (layerFilters.shifts) {
      schedules.forEach((shift: any) => {
        events.push({
          id: `shift_${shift.id}`,
          title: shift.employee?.first_name ? `${shift.employee.first_name} (Shift)` : 'Staff Shift',
          start: shift.start_at || shift.start_time,
          end: shift.end_at || shift.end_time,
          display: 'background',
          backgroundColor: '#f1f5f9',
        });
      });
    }

    // Add confirmed appointments if layer enabled
    if (layerFilters.appointments) {
      appointments.forEach((apt: any) => {
        const isSelected = selectedRequest?.id === apt.id;
        events.push({
          id: apt.id,
          title: `${apt.customer?.first_name || 'Bride'} - ${apt.service?.name || 'Appointment'} (${apt.employee?.first_name || 'Unassigned'})`,
          start: apt.start_at,
          end: apt.end_at,
          backgroundColor: isSelected ? '#be123c' : '#e11d48',
          borderColor: isSelected ? '#881337' : '#be123c',
          textColor: '#ffffff',
          extendedProps: {
            type: 'appointment',
            customerName: apt.customer ? `${apt.customer.first_name || ''} ${apt.customer.last_name || ''}`.trim() : 'Guest',
            serviceName: apt.service?.name || 'Consultation',
            status: apt.confirmation_status || 'confirmed',
            time: `${new Date(apt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(apt.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            employeeName: apt.employee ? `${apt.employee.first_name || ''} ${apt.employee.last_name || ''}`.trim() : 'Unassigned',
            roomName: apt.room?.name || 'Fitting Room'
          }
        });
      });
    }

    return events;
  }, [appointments, schedules, layerFilters, selectedRequest]);

  // Setup draggable for queue
  useEffect(() => {
    if (queueRef.current && activeMode === 'calendar') {
      const draggable = new Draggable(queueRef.current, {
        itemSelector: '.draggable-request-card',
        eventData: function (eventEl) {
          const id = eventEl.getAttribute('data-id');
          const title = eventEl.getAttribute('data-title');
          return { id, title, duration: '01:30' };
        }
      });

      return () => {
        draggable.destroy();
      };
    }
  }, [queueRef, activeMode]);

  const handleEventReceive = async (info: any) => {
    const requestId = info.event.id;
    const dropTime = info.event.start;
    const dropEndTime = new Date(dropTime.getTime() + 90 * 60 * 1000); // 1.5 hrs default

    const req = requests.find((r: any) => r.id === requestId);
    if (!req) return;

    assignRequest({
      requestId: req.id,
      employeeId: info.event.getResources?.[0]?.id || '00000000-0000-0000-0000-000000000000',
      roomId: req.preferred_room_id || '00000000-0000-0000-0000-000000000000',
      startAt: dropTime.toISOString(),
      endAt: dropEndTime.toISOString()
    }, {
      onSuccess: () => {
        toast.success('Appointment created from request!');
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
      },
      onError: (err: any) => {
        toast.error('Failed to schedule request: ' + err.message);
        info.revert();
      }
    });
  };

  const handleEventDrop = async (info: any) => {
    const newStart = info.event.start;
    const newEnd = info.event.end || new Date(newStart.getTime() + 90 * 60 * 1000);
    const employeeId = info.event.getResources?.[0]?.id || info.event.extendedProps?.raw?.employee_id || '00000000-0000-0000-0000-000000000000';

    rescheduleMutation.mutate({
      appointmentId: info.event.id,
      newStartAt: newStart.toISOString(),
      newEndAt: newEnd.toISOString(),
      newEmployeeId: employeeId
    }, {
      onSuccess: () => {
        toast.success('Appointment rescheduled successfully');
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      },
      onError: (err: any) => {
        info.revert();
        toast.error('Failed to reschedule appointment: ' + err.message);
      }
    });
  };

  const handleDateSelect = (selectInfo: any) => {
    setNewAppointmentData({
      start_at: selectInfo.startStr,
      employee_id: selectInfo.resource?.id || ''
    });
    setIsNewAppointmentModalOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    if (clickInfo.event.extendedProps.type === 'appointment') {
      updateSelectedRequestUrl({
        id: clickInfo.event.id,
        ...clickInfo.event.extendedProps
      });
    }
  };

  const { mutate: publishSchedules } = usePublishSchedules();

  const publishWorkforceSchedule = () => {
    if (businessId) {
      publishSchedules({ businessId, locationId: activeLocation }, {
        onSuccess: () => {
          toast.success('All current shifts published to team members!');
        },
        onError: () => {
          toast.error('Failed to publish schedules.');
        }
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-[#faf8f5]">
      {/* Top Segmented Workspace Mode Switcher */}
      {!hideInnerTopBar && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-white border-b border-stone-200 gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
            <button
              onClick={() => setMode('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeMode === 'calendar'
                  ? 'bg-white text-stone-900 shadow-sm font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5 text-brand-primary" />
              Calendar
            </button>
            <button
              onClick={() => setMode('requests')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeMode === 'requests'
                  ? 'bg-white text-stone-900 shadow-sm font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Inbox className="h-3.5 w-3.5 text-status-info" />
              Booking Requests
              {requests.filter((r: any) => r.status === 'new' || r.status === 'submitted').length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-brand-primary text-white text-[10px] font-bold">
                  {requests.filter((r: any) => r.status === 'new' || r.status === 'submitted').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setMode('workforce')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeMode === 'workforce'
                  ? 'bg-white text-stone-900 shadow-sm font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-vowos-violet" />
              Workforce
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeMode === 'ai'
                  ? 'bg-white text-stone-900 shadow-sm font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-status-warning" />
              AI Planner
            </button>
            <button
              onClick={() => setMode('capacity')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeMode === 'capacity'
                  ? 'bg-white text-stone-900 shadow-sm font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-status-success" />
              Capacity
            </button>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2">
            <NotificationPermissionToggle />
            {activeMode === 'workforce' && (
              <Button
                onClick={publishWorkforceSchedule}
                variant="outline"
                size="sm"
                className="text-xs font-medium border-stone-200"
              >
                <Check className="h-3.5 w-3.5 mr-1.5 text-status-success" />
                Publish Shifts
              </Button>
            )}

            <Button
              onClick={() => setIsNewRequestModalOpen(true)}
              variant="outline"
              size="sm"
              className="text-xs font-medium border-stone-200"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Request
            </Button>

            <Button
              onClick={() => setIsNewAppointmentModalOpen(true)}
              size="sm"
              className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Appointment
            </Button>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden relative">
        {/* Left Panel: Mode-Specific Actions & Filter Queue */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-stone-200 bg-white flex flex-col shrink-0">
          {activeMode === 'calendar' && (
            <div className="p-4 flex flex-col h-full overflow-y-auto">
              <h3 className="font-semibold text-sm text-stone-900 mb-3 flex items-center justify-between">
                <span>Unassigned Requests</span>
                <Badge variant="secondary" className="text-xs">{requests.length}</Badge>
              </h3>
              <p className="text-xs text-stone-500 mb-4">
                Drag a booking request onto the calendar to assign time and consultant.
              </p>

              <div ref={queueRef} className="space-y-3 flex-1 overflow-y-auto pr-1">
                {requests.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs border border-dashed border-stone-200 rounded-xl">
                    No pending booking requests
                  </div>
                ) : (
                  requests.map((req: any) => (
                    <DraggableAppointmentCard
                      key={req.id}
                      request={req}
                      onSelect={(r) => updateSelectedRequestUrl({ type: 'request', id: r.id, raw: r })}
                      onAssign={(r) => setAssigningRequest(r)}
                    />
                  ))
                )}
              </div>

              {/* Layer Toggles */}
              <div className="mt-4 pt-4 border-t border-stone-200">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Calendar Layers</p>
                <div className="space-y-1.5 text-xs text-stone-600">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={layerFilters.appointments} 
                      onChange={e => setLayerFilters({...layerFilters, appointments: e.target.checked})}
                      className="rounded border-stone-300 text-brand-primary focus:ring-focus-ring" 
                    />
                    <span>Confirmed Appointments</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={layerFilters.shifts} 
                      onChange={e => setLayerFilters({...layerFilters, shifts: e.target.checked})}
                      className="rounded border-stone-300 text-brand-primary focus:ring-focus-ring" 
                    />
                    <span>Employee Staff Shifts</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeMode === 'requests' && (
            <div className="p-4 flex flex-col h-full overflow-y-auto">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1 mb-4" aria-label="Booking request view">
                <button
                  type="button"
                  onClick={() => changeRequestView('active')}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${requestView === 'active' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                >
                  Active ({activeRequestCount})
                </button>
                <button
                  type="button"
                  onClick={() => changeRequestView('archived')}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${requestView === 'archived' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                >
                  Archived ({archivedRequestCount})
                </button>
              </div>
              <h3 className="font-semibold text-sm text-stone-900 mb-1">Request Status Pipeline</h3>
              <p className="text-[11px] text-stone-500 mb-3">Click any stage to filter queue.</p>
              <div className="space-y-2">
                {(requestView === 'archived' ? [
                  { id: 'all', label: 'All Archived', count: archivedRequestCount, color: 'bg-stone-600' },
                  { id: 'sold', label: 'Sold', count: soldArchivedCount, color: 'bg-emerald-600' },
                  { id: 'unsold', label: 'Unsold', count: unsoldArchivedCount, color: 'bg-rose-500' },
                  { id: 'unclassified', label: 'Not Classified', count: unclassifiedArchivedCount, color: 'bg-stone-400' },
                ] : [
                  { id: 'all', label: 'All Inquiries', count: activeRequestCount, color: 'bg-stone-600' },
                  { id: 'new', label: 'New Inquiries', count: newRequestCount, color: 'bg-status-info' },
                  { id: 'review', label: 'Staffing Review', count: requestSummary?.review ?? 0, color: 'bg-vowos-violet' },
                  { id: 'ai_ready', label: 'AI Ready', count: requestSummary?.aiReady ?? 0, color: 'bg-status-warning' },
                  { id: 'pending', label: 'Confirmation Pending', count: requestSummary?.confirmationPending ?? 0, color: 'bg-brand-primary' },
                  { id: 'waitlist', label: 'Waitlist', count: requestSummary?.waitlist ?? 0, color: 'bg-stone-400' },
                ]).map(group => (
                  <div 
                    key={group.id} 
                    onClick={() => setStatusFilter(statusFilter === group.id ? 'all' : group.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${statusFilter === group.id ? 'bg-indigo-50 border-indigo-300 font-bold' : 'border-stone-100 hover:bg-stone-50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${group.color}`} />
                      <span className="text-xs text-stone-700">{group.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{group.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMode === 'workforce' && (
            <div className="p-4 flex flex-col h-full overflow-y-auto">
              <h3 className="font-semibold text-sm text-stone-900 mb-3">Team & Shifts</h3>
              <p className="text-xs text-stone-500 mb-4">Select a consultant to focus schedule or edit template shifts.</p>
              
              <div className="mb-4">
                <label className="text-xs font-semibold text-stone-700 block mb-1">Filter Staff</label>
                <Select value={selectedWorkforceStaff} onValueChange={setSelectedWorkforceStaff}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="All Consultants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Consultants</SelectItem>
                    {staff.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                <Button 
                  onClick={() => setShiftModalData({ isOpen: true, data: { employee_id: selectedWorkforceStaff !== 'all' ? selectedWorkforceStaff : '' } })} 
                  variant="outline" 
                  className="text-xs mb-2 w-full"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom Shift
                </Button>
            </div>
          )}

          {activeMode === 'ai' && (
            <div className="p-4 flex flex-col h-full overflow-y-auto">
              <h3 className="font-semibold text-sm text-stone-900 mb-2 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-status-warning" /> Operational Insights
              </h3>
              <p className="text-xs text-stone-500 mb-4">AI detected 3 optimization opportunities for today's schedule.</p>
              
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-status-warning/20 bg-status-warning/10/50 text-xs">
                  <p className="font-semibold text-stone-900 mb-1">Fill Saturday Staffing Gap</p>
                  <p className="text-stone-600 mb-2">High demand for Bridal Consultations. Recommend adding 1 Senior Stylist shift.</p>
                  <Button size="sm" variant="default" className="bg-stone-900 text-white">Review</Button>
                </div>
              </div>
            </div>
          )}

          {activeMode === 'capacity' && (
            <div className="p-4 flex flex-col h-full overflow-y-auto">
              <h3 className="font-semibold text-sm text-stone-900 mb-2">Daily Capacity</h3>
              <p className="text-xs text-stone-500 mb-4">View peak utilization for today.</p>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Eligible Employees:</span>
                  <span className="font-bold text-stone-900">{capacityMetrics?.eligibleEmployees || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Scheduled Employees:</span>
                  <span className="font-bold text-stone-900">{capacityMetrics?.scheduledEmployees || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Staffing Gap (Hrs):</span>
                  <span className="font-bold text-stone-900">{capacityMetrics?.staffingGap?.toFixed(1) || '0.0'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center Panel: Primary View Display */}
        <div className="flex-1 p-2 md:p-4 bg-[#faf8f5] overflow-y-auto overflow-x-hidden w-full">
          {activeMode === 'calendar' && (
            <Card className="h-full flex flex-col shadow-xs border-stone-200 overflow-hidden">
              <CardContent className="p-1 md:p-3 flex-1 min-h-[500px] overflow-hidden">
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                  }}
                  events={calendarEvents}
                  editable={true}
                  selectable={true}
                  droppable={true}
                  eventReceive={handleEventReceive}
                  eventDrop={handleEventDrop}
                  select={handleDateSelect}
                  eventClick={handleEventClick}
                  height="100%"
                  slotMinTime="08:00:00"
                  slotMaxTime="20:00:00"
                />
              </CardContent>
            </Card>
          )}

          {activeMode === 'requests' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100/60 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">
                    {requestView === 'archived' ? 'Archived Booking Requests' : 'Booking Requests Queue'}
                  </h2>
                  <p className="text-xs text-stone-500">
                    {requestView === 'archived'
                      ? 'Review sold and unsold outcomes, restore records, or permanently remove selected archives.'
                      : 'Manage incoming appointments, boutique suites, and consultant assignments.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={storeFilter} onValueChange={setStoreFilter}>
                    <SelectTrigger className="w-44 h-8 text-xs font-semibold bg-white border-rose-200">
                      <SelectValue placeholder="All Boutiques" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Boutiques</SelectItem>
                      <SelectItem value="proper">Proper & Company</SelectItem>
                      <SelectItem value="ido">I Do Bridal Couture</SelectItem>
                    </SelectContent>
                  </Select>

                  {requestView === 'active' && (
                    <Button onClick={() => setIsNewRequestModalOpen(true)} size="sm" className="bg-rose-700 hover:bg-rose-800 text-white flex items-center gap-1 text-xs h-8">
                      <Plus className="h-4 w-4" /> New Request
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-booking-requests"
                    checked={selectAllMatching}
                    onCheckedChange={toggleSelectAllMatching}
                    disabled={matchingRequestCount === 0 || isBulkUpdating}
                    aria-label={`Select all ${matchingRequestCount} matching booking requests`}
                  />
                  <label htmlFor="select-all-booking-requests" className="cursor-pointer text-xs font-semibold text-stone-700">
                    Select all {matchingRequestCount.toLocaleString()} matching
                  </label>
                  <span className="text-[11px] text-stone-400">
                    {selectAllMatching
                      ? `${matchingRequestCount.toLocaleString()} selected across the full queue`
                      : selectedRequestIds.size > 0
                        ? `${selectedRequestIds.size.toLocaleString()} individually selected`
                        : `${displayRequests.length.toLocaleString()} loaded`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {requestView === 'active' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setIsArchiveOlderOpen(true)}
                    >
                      <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive Older…
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={selectedRequestCount === 0 || isBulkUpdating}
                      >
                        Bulk Actions <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {requestView === 'active' ? (
                        <>
                          <DropdownMenuItem onSelect={() => setPendingBulkAction('sold_archive')}>
                            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Mark sold &amp; archive
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setPendingBulkAction('unsold_archive')}>
                            <XCircle className="mr-2 h-4 w-4 text-rose-600" /> Mark unsold &amp; archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setPendingBulkAction('archive')}>
                            <Archive className="mr-2 h-4 w-4 text-amber-700" /> Archive without outcome
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem onSelect={() => setPendingBulkAction('restore')}>
                            <RotateCcw className="mr-2 h-4 w-4 text-sky-700" /> Restore to active queue
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => setPendingBulkAction('delete')}
                            disabled={selectAllMatching}
                            className="text-red-700 focus:text-red-700"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {selectAllMatching ? 'Delete requires individual selection' : 'Delete permanently'}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {requestLoadError ? (
                <div className="py-12 flex flex-col items-center justify-center text-center bg-red-50/40 border border-red-200 rounded-2xl p-8">
                  <div className="h-10 w-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-3">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-stone-900">Booking requests could not load</h4>
                  <p className="text-xs text-stone-600 max-w-sm mt-1 mb-4">
                    {requestLoadError instanceof Error ? requestLoadError.message : 'The booking-request service returned an error.'}
                  </p>
                  <Button
                    onClick={() => { void requestQuery.refetch(); void requestSummaryQuery.refetch(); }}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Try Again
                  </Button>
                </div>
              ) : displayRequests.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center bg-stone-50/50 border border-dashed border-stone-200 rounded-2xl p-8">
                  <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-stone-900">No Inquiries Found</h4>
                  <p className="text-xs text-stone-500 max-w-sm mt-1 mb-4">
                    There are currently no appointment requests matching your filter criteria.
                  </p>
                  <Button onClick={() => { setStatusFilter('all'); setStoreFilter('all'); }} variant="outline" size="sm" className="text-xs">
                    Reset Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayRequests.map((req: any) => {
                    const parsedNotes = parseNotes(req.notes);
                    const customerName = req.customer?.name || (req.customer?.first_name ? `${req.customer.first_name} ${req.customer.last_name || ''}`.trim() : null) || parsedNotes['First and Last Name'] || parsedNotes['First + Last Name'] || 'Guest Customer';
                    const phone = req.customerPhone || req.customer?.phone || parsedNotes['Contact Phone'] || parsedNotes['Phone'];
                    const email = req.customerEmail || req.customer?.email || parsedNotes['Email'];
                    const location = parsedNotes['Store Location'] || req.location_name || 'Main Store';
                    const service = req.service?.name || parsedNotes['Occasion Type'] || parsedNotes['Service'] || 'Bridal Appointment';
                    const budget = parsedNotes['Wedding Dress Budget'] || parsedNotes['Price Point'] || (req.budget && String(req.budget) !== '0' ? `$${req.budget}` : null) || '$2,000 - $4,000 (Standard)';
                    const drinkRec = parsedNotes['Drink Preference'] || (parsedNotes['Occasion Type']?.includes('Evening') ? 'Premium Prosecco' : 'Signature Champagne Toast & Mimosa');
                    const fittingSuite = parsedNotes['Occasion Type']?.includes('Evening') ? 'Suite B - Cocktail Lounge' : 'Suite A - Rose Bridal Suite';
                    const submittedAt = req.submitted_at || req.created_at ? new Date(req.submitted_at || req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently';
                    const outcome = getAppointmentRequestOutcome(req.status);
                    const statusLabel = outcome === 'sold'
                      ? 'Sold · Archived'
                      : outcome === 'unsold'
                        ? 'Unsold · Archived'
                        : req.status === 'archived'
                          ? 'Archived'
                          : req.status || 'submitted';

                    return (
                      <Card key={req.id} className={`hover:border-rose-200 transition-all shadow-xs hover:shadow-md relative flex flex-col justify-between rounded-xl overflow-hidden bg-white ${selectAllMatching || selectedRequestIds.has(req.id) ? 'border-rose-400 ring-2 ring-rose-100' : 'border-rose-100/70'}`}>
                        <CardHeader className="p-4 pb-2 border-b border-rose-50 bg-gradient-to-r from-rose-50/40 via-amber-50/20 to-white">
                          <div className="flex justify-between items-start">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <Checkbox
                                checked={selectAllMatching || selectedRequestIds.has(req.id)}
                                onCheckedChange={() => toggleRequestSelection(req.id)}
                                disabled={selectAllMatching || isBulkUpdating}
                                aria-label={`Select booking request for ${customerName}`}
                                className="mt-0.5 shrink-0"
                              />
                              <div className="min-w-0">
                                <CardTitle className="text-sm font-bold text-stone-900 flex items-center gap-2 truncate">
                                  {customerName}
                                </CardTitle>
                                <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3 text-rose-400" /> {location}
                                </p>
                              </div>
                            </div>
                            <Badge className={
                              outcome === 'sold' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              outcome === 'unsold' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                              req.status === 'submitted' || req.status === 'new' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              req.status === 'confirmed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              'bg-stone-50 text-stone-700 border-stone-200'
                            }>
                              {statusLabel}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-3 text-xs text-stone-600 space-y-2 flex-1">
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="font-semibold text-stone-800 block">Service:</span>
                              <span className="text-stone-600">{service}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-stone-800 block">Budget:</span>
                              <span className="text-stone-600">{budget}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-stone-800 block">Submitted:</span>
                              <span className="text-stone-500">{submittedAt}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-stone-800 block">Guests:</span>
                              <span className="text-stone-500">{parsedNotes['Number In Party'] || '1 Bride + Guests'}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-stone-100 space-y-1">
                            {(phone || email) && (
                              <p className="text-[11px] text-stone-500 flex items-center gap-2 truncate">
                                {phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-stone-400" /> {phone}</span>}
                                {email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 text-stone-400" /> {email}</span>}
                              </p>
                            )}
                            <p className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
                              <Wine className="h-3 w-3 text-amber-600" /> 🥂 {drinkRec}
                            </p>
                            <p className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                              <span>🏛️ {fittingSuite}</span>
                            </p>
                          </div>

                          <div className="pt-3 flex items-center justify-between gap-1 border-t border-stone-100">
                            <div className="flex gap-1.5">
                              {requestView === 'active' && (
                                <Button
                                  onClick={() => setAssigningRequest(req)}
                                  size="sm"
                                  className="bg-brand-primary hover:bg-brand-primary-hover text-white text-[11px] px-2.5 h-7"
                                >
                                  <Sparkles className="h-3 w-3 mr-1" /> AI Assign
                                </Button>
                              )}
                              <Button 
                                onClick={() => updateSelectedRequestUrl({ type: 'request', id: req.id, raw: req })} 
                                variant="outline" 
                                size="sm"
                                className="text-[11px] px-2.5 h-7"
                              >
                                View 360
                              </Button>
                            </div>

                            <div className="flex gap-1">
                              {requestView === 'active' ? (
                                <>
                                  <Button
                                    onClick={() => setEditingRequest(req)}
                                    variant="ghost"
                                    size="icon"
                                    title="Edit Request"
                                    className="h-7 w-7 text-stone-500 hover:text-stone-800"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    onClick={() => handleArchiveRequest(req.id)}
                                    variant="ghost"
                                    size="icon"
                                    title="Archive Request"
                                    className="h-7 w-7 text-stone-500 hover:text-amber-700"
                                  >
                                    <Archive className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    onClick={() => {
                                      setSelectedRequestIds(new Set([req.id]));
                                      setPendingBulkAction('restore');
                                    }}
                                    variant="ghost"
                                    size="icon"
                                    title="Restore Request"
                                    className="h-7 w-7 text-stone-500 hover:text-sky-700"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setSelectedRequestIds(new Set([req.id]));
                                      setPendingBulkAction('delete');
                                    }}
                                    variant="ghost"
                                    size="icon"
                                    title="Delete Request Permanently"
                                    className="h-7 w-7 text-stone-400 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeMode === 'workforce' && (
            <Card className="h-full flex flex-col shadow-xs border-stone-200 p-2 md:p-4 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                  <div>
                    <h3 className="font-bold text-base text-stone-900">Workforce & Employee Schedule</h3>
                    <p className="text-xs text-stone-500">Manage shifts, breaks, and consultant coverage</p>
                  </div>
                  <div className="flex items-center gap-3 ml-8 border-l border-stone-200 pl-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-stone-500">Staffing Gap</span>
                      <span className="text-sm font-semibold text-brand-primary flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Saturday (+1 Stylist)
                      </span>
                    </div>
                    <div className="flex flex-col ml-4">
                      <span className="text-[10px] uppercase font-bold text-stone-500">Peak Capacity</span>
                      <span className="text-sm font-semibold text-status-warning">
                        85% on Thu
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-white rounded-md shadow-inner border border-stone-100 p-2">
                <WorkforceMatrix 
                  staff={staff.filter((s: any) => selectedWorkforceStaff === 'all' || s.id === selectedWorkforceStaff)}
                  schedules={schedules}
                  timeOffRequests={timeOffRequests}
                  currentDate={new Date()}
                  onShiftClick={(shift) => setShiftModalData({ isOpen: true, data: shift })}
                  onEmptySlotClick={(employeeId, date) => {
                    const localDateStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                    setShiftModalData({ 
                      isOpen: true, 
                      data: { 
                        employee_id: employeeId, 
                        start: `${localDateStr}T09:00:00`,
                        end: `${localDateStr}T17:00:00`
                      } 
                    });
                  }}
                />
              </div>
            </Card>
          )}

          {activeMode === 'ai' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-status-warning" /> AI Scheduling Optimization & Recommendations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {requests.filter((r: any) => r.status === 'new' || r.status === 'submitted' || r.status === 'ai_ready').length === 0 ? (
                  <div className="col-span-full p-8 text-center text-stone-500 border border-dashed border-stone-200 rounded-xl">
                    No pending booking requests requiring AI assignment.
                  </div>
                ) : (
                  requests
                    .filter((r: any) => r.status === 'new' || r.status === 'submitted' || r.status === 'ai_ready')
                    .map((req: any) => (
                      <AIRequestCard key={req.id} request={req} onAssign={setAssigningRequest} />
                    ))
                )}
              </div>
            </div>
          )}

          {activeMode === 'capacity' && capacityMetrics && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-stone-900">Capacity Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-stone-200 shadow-sm flex flex-col items-center justify-center">
                  <span className="text-sm text-stone-500">Bookable Hours</span>
                  <span className="text-2xl font-bold text-stone-900">{capacityMetrics.bookableHours.toFixed(1)}</span>
                </Card>
                <Card className="p-4 border-stone-200 shadow-sm flex flex-col items-center justify-center">
                  <span className="text-sm text-stone-500">Confirmed Hours</span>
                  <span className="text-2xl font-bold text-stone-900">{capacityMetrics.confirmedHours.toFixed(1)}</span>
                </Card>
                <Card className="p-4 border-stone-200 shadow-sm flex flex-col items-center justify-center">
                  <span className="text-sm text-stone-500">Held Hours</span>
                  <span className="text-2xl font-bold text-stone-900">{capacityMetrics.heldHours.toFixed(1)}</span>
                </Card>
                <Card className="p-4 border-stone-200 shadow-sm flex flex-col items-center justify-center">
                  <span className="text-sm text-stone-500">Staffing Gap</span>
                  <span className="text-2xl font-bold text-brand-primary">{capacityMetrics.staffingGap.toFixed(1)}</span>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: 360 Detail View */}
        {selectedRequest && (
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] lg:w-[560px] border-l border-stone-200 bg-white p-0 shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col h-full">
            {selectedRequest.type === 'appointment' ? (
              <Appointment360Panel appointmentId={selectedRequest.id} request={selectedRequest.raw} onClose={() => updateSelectedRequestUrl(null)} />
            ) : (
              <Request360Panel 
                requestId={selectedRequest.id} 
                request={selectedRequest.raw} 
                onClose={() => updateSelectedRequestUrl(null)} 
                onEdit={(req) => setEditingRequest(req)}
                onArchive={(id) => handleArchiveRequest(id)}
                onDelete={(id) => handleDeleteRequest(id)}
              />
            )}
          </div>
        )}
      </div>

      {/* Drawers and Modals */}
      {assigningRequest && (
        <AIAssignmentDrawer
          isOpen={!!assigningRequest}
          onClose={() => setAssigningRequest(null)}
          request={assigningRequest}
          onAssign={(rec) => {
            const startAtStr = assigningRequest.preferred_date_1 || new Date().toISOString().split('T')[0];
            const startDate = new Date(startAtStr);
            const validStartDate = isNaN(startDate.getTime()) ? new Date() : startDate;
            assignRequest({
              requestId: assigningRequest.id,
              employeeId: rec.employee_id,
              roomId: assigningRequest.preferred_room_id || '00000000-0000-0000-0000-000000000000',
              startAt: validStartDate.toISOString(),
              endAt: new Date(validStartDate.getTime() + 60 * 60 * 1000).toISOString()
            });
            setAssigningRequest(null);
          }}
        />
      )}

      {isNewAppointmentModalOpen && (
        <NewAppointmentModal
          isOpen={isNewAppointmentModalOpen}
          onClose={() => {
            setIsNewAppointmentModalOpen(false);
            setNewAppointmentData(null);
          }}
          initialData={newAppointmentData}
        />
      )}

      {isNewRequestModalOpen && (
        <NewRequestModal
          isOpen={isNewRequestModalOpen}
          onClose={() => setIsNewRequestModalOpen(false)}
        />
      )}

      {editingRequest && (
        <EditRequestModal
          isOpen={!!editingRequest}
          onClose={() => setEditingRequest(null)}
          request={editingRequest}
        />
      )}

      {shiftModalData.isOpen && (
        <EmployeeShiftModal
          isOpen={shiftModalData.isOpen}
          onClose={() => setShiftModalData({ isOpen: false, data: null })}
          initialData={shiftModalData.data}
        />
      )}

      <Dialog
        open={isArchiveOlderOpen}
        onOpenChange={(open) => {
          if (!isBulkUpdating) setIsArchiveOlderOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Archive older booking requests</DialogTitle>
            <DialogDescription>
              This runs across every matching request in the current location and boutique filters, including records beyond the 1,000-row display limit. No emails are sent.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">Older than</label>
              <Select value={archiveAgeDays} onValueChange={setArchiveAgeDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">6 months</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="730">2 years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">Sales outcome</label>
              <Select value={archiveOlderOutcome} onValueChange={(value) => setArchiveOlderOutcome(value as typeof archiveOlderOutcome)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="archive">Not classified</SelectItem>
                  <SelectItem value="sold_archive">Sold</SelectItem>
                  <SelectItem value="unsold_archive">Unsold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Requests submitted before {new Date(getArchiveCutoffIso(Number(archiveAgeDays))).toLocaleDateString()} will be archived. Newer requests remain active.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveOlderOpen(false)} disabled={isBulkUpdating}>
              Cancel
            </Button>
            <Button onClick={archiveOlderRequests} disabled={isBulkUpdating}>
              {isBulkUpdating ? 'Archiving…' : 'Archive older requests'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingBulkAction !== null}
        onOpenChange={(open) => {
          if (!open && !isBulkUpdating) {
            setPendingBulkAction(null);
            setBulkConfirmText('');
          }
        }}
      >
        {pendingBulkAction && (
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle>{BULK_ACTION_COPY[pendingBulkAction].title}</DialogTitle>
              <DialogDescription>
                {selectedRequestCount.toLocaleString()} request{selectedRequestCount === 1 ? '' : 's'} selected{selectAllMatching ? ' across the full filtered queue' : ''}.{' '}
                {BULK_ACTION_COPY[pendingBulkAction].description}
              </DialogDescription>
            </DialogHeader>

            {pendingBulkAction === 'delete' && (
              <Input
                value={bulkConfirmText}
                onChange={(event) => setBulkConfirmText(event.target.value)}
                placeholder="Type DELETE"
                autoComplete="off"
                aria-label="Type DELETE to confirm permanent deletion"
              />
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setPendingBulkAction(null);
                  setBulkConfirmText('');
                }}
                disabled={isBulkUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={runSelectedBulkAction}
                disabled={isBulkUpdating || (pendingBulkAction === 'delete' && bulkConfirmText !== 'DELETE')}
                className={pendingBulkAction === 'delete' ? 'bg-red-700 text-white hover:bg-red-800' : undefined}
              >
                {isBulkUpdating ? 'Working…' : BULK_ACTION_COPY[pendingBulkAction].confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function AIRequestCard({ request, onAssign }: { request: any; onAssign: (req: any) => void }) {
  return (
    <Card className="border-stone-200 hover:border-amber-300 transition-all bg-white shadow-xs">
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-bold text-stone-900">
            {request.customer?.name || `${request.customer?.first_name || ''} ${request.customer?.last_name || ''}`.trim() || 'Guest'}
          </CardTitle>
          <Badge className="bg-amber-100 text-amber-800 border-status-warning/20">
            {request.status || 'New'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-xs text-stone-600 space-y-2">
        <p><span className="font-semibold text-stone-800">Service:</span> {request.service?.name || 'Bridal Fitting'}</p>
        <p><span className="font-semibold text-stone-800">Preferred Date:</span> {request.preferred_date_1 || 'Flexible'}</p>
        <p><span className="font-semibold text-stone-800">Guests:</span> {request.number_of_guests || 1}</p>
        <div className="pt-3 flex gap-2">
          <Button 
            onClick={() => onAssign(request)} 
            size="sm" 
            className="bg-status-warning hover:bg-amber-600 text-white font-medium flex-1"
          >
            <Sparkles className="h-3 w-3 mr-1" /> AI Optimize
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
