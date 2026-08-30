import { useWorkspaceTab } from '@/lib/navigation/useWorkspaceTab';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Lock, Copy, Settings, Plus, CalendarDays, Inbox, Users, BarChart3, Sliders } from 'lucide-react';
import { toast } from 'sonner';

import { useDemo } from '@/lib/demo/demoContext';
import { UnifiedSchedulingWorkspace } from '@/pages/scheduling/UnifiedSchedulingWorkspace';
import { Appointment360Panel } from '@/pages/scheduling/Appointment360Panel';
import { NewRequestModal } from '@/pages/scheduling/NewRequestModal';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { useModuleResolution } from '@/lib/modules/resolver';
import { Appointment, APPOINTMENT_TYPES } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { useAppointmentRequests, useBusiness } from '@/lib/services/schedulingService';

import { AppointmentRosterTab } from '@/components/vowos/appointments/AppointmentRosterTab';
import { AvailabilityRulesTab } from '@/components/vowos/settings/tabs/AvailabilityRulesTab';
import { BookingSettingsTab } from '@/components/vowos/settings/tabs/BookingSettings';
import BookAppointmentModal from '@/components/vowos/BookAppointmentModal';

const TABS = [
  { id: 'calendar', label: '📅 Schedule & Calendar', module: 'scheduling.core' },
  { id: 'booking-requests', label: '📥 Booking Requests', module: 'scheduling.online' },
  { id: 'workforce', label: '👥 Workforce', module: 'scheduling.core' },
  { id: 'capacity', label: '📊 Capacity', module: 'scheduling.resources' },
  { id: 'operations', label: '⚙️ Operations & Rules', module: 'scheduling.core' }
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AppointmentsWorkspace() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { requestedTab, setTab } = useWorkspaceTab('appointments', 'calendar');
  const { resolveFeatureAvailability } = useModuleResolution();
  const { appointments, selectedLocationIds } = useVowosData();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [activeOpsTab, setActiveOpsTab] = useState<string>('check-in');

  const { data: business } = useBusiness();
  const { data: fetchedRequests = [] } = useAppointmentRequests(business?.id, selectedLocationIds);
  const pendingRequestsCount = (fetchedRequests || []).filter((r: any) => r.status !== 'archived' && r.status !== 'deleted').length;

  const bookingUrlPath = isDemoMode ? '/demoapp/book' : '/book';
  const fullBookingUrl = `${window.location.origin}${bookingUrlPath}`;

  const requested = requestedTab as TabId;

  const resolved = TABS.map((t) => {
    const r = resolveFeatureAvailability(t.module);
    return { ...t, effective: r.effective, reason: r.reason };
  });
  const visible = resolved.filter((t) => t.reason !== 'WORKSPACE_DISABLED' && t.reason !== 'PARENT_DISABLED');

  const currentTab: TabId = visible.some((t) => t.id === requested) ? requested : (visible[0]?.id ?? 'calendar');

  const renderOperationsSubTab = () => {
    switch (activeOpsTab) {
      case 'check-in':
        return (
          <AppointmentRosterTab
            title="Today's Check-Ins"
            description="Appointments scheduled for today requiring check-in."
            filterFn={(a) => a.status === 'Confirmed'}
            emptyLabel="No appointments to check in"
            onSelect={setSelectedAppointment}
          />
        );
      case 'no-shows':
        return (
          <AppointmentRosterTab
            title="No-Shows & Cancellations"
            description="Track missed appointments and cancellation logs."
            filterFn={(a) => a.status === 'Cancelled'}
            emptyLabel="No missed appointments"
            onSelect={setSelectedAppointment}
          />
        );
      case 'follow-up':
        return (
          <AppointmentRosterTab
            title="Appointment Follow-Ups"
            description="Completed appointments requiring post-visit outreach."
            filterFn={(a) => a.status === 'Completed'}
            emptyLabel="No follow-ups needed"
            onSelect={setSelectedAppointment}
          />
        );
      case 'appointment-types':
        return (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-200">
              <h3 className="text-lg font-bold text-stone-900">Appointment Types & Metrics</h3>
              <p className="text-sm text-stone-500">Distribution of your boutique appointments by type.</p>
            </div>
            <div className="divide-y divide-stone-100">
              {APPOINTMENT_TYPES.map((type) => {
                const count = appointments.filter((a) => a.type === type).length;
                return (
                  <div key={type} className="px-6 py-4 flex items-center justify-between hover:bg-stone-50">
                    <span className="font-medium text-stone-900">{type}</span>
                    <span className="bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-sm font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'availability':
        return (
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h3 className="text-lg font-bold text-stone-900 mb-6">Staff Availability Rules</h3>
            <AvailabilityRulesTab onDirtyChange={() => {}} registerSaveRef={() => {}} resetTrigger={0} />
          </div>
        );
      case 'online-booking':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-stone-900">Public Booking Link</h3>
                <p className="text-sm text-stone-500">Share this link with brides to allow online booking.</p>
                <div className="mt-2 text-sm font-mono bg-stone-50 px-3 py-2 rounded text-stone-600 break-all">{fullBookingUrl}</div>
              </div>
              <Button onClick={() => {
                navigator.clipboard.writeText(fullBookingUrl);
                toast.success('Booking URL copied to clipboard');
              }} className="shrink-0 gap-2">
                <Copy className="h-4 w-4" />
                Copy Link
              </Button>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <BookingSettingsTab onDirtyChange={() => {}} registerSaveRef={() => {}} resetTrigger={0} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderBody = (id: TabId) => {
    switch (id) {
      case 'calendar':
        return <UnifiedSchedulingWorkspace defaultMode="calendar" hideInnerTopBar={true} />;
      case 'booking-requests':
        return <UnifiedSchedulingWorkspace defaultMode="requests" hideInnerTopBar={true} />;
      case 'workforce':
        return <UnifiedSchedulingWorkspace defaultMode="workforce" hideInnerTopBar={true} />;
      case 'capacity':
        return <UnifiedSchedulingWorkspace defaultMode="capacity" hideInnerTopBar={true} />;
      case 'operations':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl overflow-x-auto">
              {[
                { subId: 'check-in', label: 'Check-In' },
                { subId: 'no-shows', label: 'No-Shows' },
                { subId: 'follow-up', label: 'Follow-Up' },
                { subId: 'appointment-types', label: 'Appointment Types' },
                { subId: 'availability', label: 'Availability Rules' },
                { subId: 'online-booking', label: 'Online Booking' }
              ].map((sub) => (
                <button
                  key={sub.subId}
                  onClick={() => setActiveOpsTab(sub.subId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    activeOpsTab === sub.subId
                      ? 'bg-white text-stone-900 shadow-sm font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
            {renderOperationsSubTab()}
          </div>
        );
      default:
        return <UnifiedSchedulingWorkspace hideInnerTopBar={true} />;
    }
  };

  return (
    <div className="space-y-4 relative h-full flex flex-col">
      {/* Streamlined Single Authoritative Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 border-b border-rose-100/60 pb-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Appointments</h1>
          <p className="text-xs text-stone-500">Manage boutique schedules, booking inquiries, workforce, and store operations.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsNewRequestModalOpen(true)} className="gap-1 text-xs h-8 font-medium">
            <Plus className="h-3.5 w-3.5" />
            New Request
          </Button>
          <Button className="gap-1 text-xs h-8 bg-rose-700 hover:bg-rose-800 text-white font-semibold shadow-xs" onClick={() => setIsBookModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New Appointment
          </Button>
        </div>
      </div>
      
      <Tabs value={currentTab} onValueChange={setTab} className="w-full flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto pb-1 scrollbar-none shrink-0">
          <TabsList className="bg-stone-100/80 p-1 rounded-xl flex-nowrap inline-flex">
            {visible.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="whitespace-nowrap flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5">
                {t.label} 
                {t.id === 'booking-requests' && pendingRequestsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                    {pendingRequestsCount}
                  </span>
                )}
                {!t.effective && <Lock className="h-3 w-3 text-stone-300" />}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {visible.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-3 flex-1 min-h-0">
            {t.effective ? (
              renderBody(t.id)
            ) : (
              <ModuleLocked
                title={t.label}
                description="This feature is available as an upgrade to your current plan."
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Appointment360Panel 
        appointmentId={selectedAppointment?.id ?? null} 
        request={null}
        onClose={() => setSelectedAppointment(null)} 
      />

      <BookAppointmentModal
        open={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
      />

      <NewRequestModal
        isOpen={isNewRequestModalOpen}
        onClose={() => setIsNewRequestModalOpen(false)}
      />
    </div>
  );
}
