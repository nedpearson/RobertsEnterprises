import { useWorkspaceTab } from '@/lib/navigation/useWorkspaceTab';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Lock, Copy, Settings } from 'lucide-react';
import { toast } from 'sonner';

import { useDemo } from '@/lib/demo/demoContext';
import { UnifiedSchedulingWorkspace } from '@/pages/scheduling/UnifiedSchedulingWorkspace';
import { Appointment360Panel } from '@/pages/scheduling/Appointment360Panel';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { useModuleResolution } from '@/lib/modules/resolver';
import { Appointment, APPOINTMENT_TYPES } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';

import { AppointmentRosterTab } from '@/components/vowos/appointments/AppointmentRosterTab';
import { AvailabilityRulesTab } from '@/components/vowos/settings/tabs/AvailabilityRulesTab';
import { BookingSettingsTab } from '@/components/vowos/settings/tabs/BookingSettings';
import BookAppointmentModal from '@/components/vowos/BookAppointmentModal';


const TABS = [
  { id: 'overview', label: 'Overview', module: 'scheduling.core' },
  { id: 'calendar', label: 'Calendar', module: 'scheduling.core' },
  { id: 'appointments', label: 'Appointments', module: 'scheduling.core' },
  { id: 'booking-requests', label: 'Booking Requests', module: 'scheduling.online' },
  { id: 'check-in', label: 'Check-In', module: 'scheduling.core' },
  { id: 'no-shows', label: 'No-Shows', module: 'scheduling.core' },
  { id: 'follow-up', label: 'Follow-Up', module: 'scheduling.core' },
  { id: 'appointment-types', label: 'Appointment Types', module: 'scheduling.core' },
  { id: 'reminders', label: 'Reminders', module: 'communications.automations' },
  { id: 'availability', label: 'Availability', module: 'scheduling.core' },
  { id: 'online-booking', label: 'Online Booking', module: 'scheduling.online' },
  { id: 'resources', label: 'Resources', module: 'scheduling.resources' }
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AppointmentsWorkspace() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { requestedTab, setTab } = useWorkspaceTab('appointments', 'overview');
  const { resolveFeatureAvailability } = useModuleResolution();
  const { appointments } = useVowosData();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  const bookingUrlPath = isDemoMode ? '/demoapp/book' : '/book';
  const fullBookingUrl = `${window.location.origin}${bookingUrlPath}`;

  const requested = requestedTab as TabId;

  const resolved = TABS.map((t) => {
    const r = resolveFeatureAvailability(t.module);
    return { ...t, effective: r.effective, reason: r.reason };
  });
  const visible = resolved.filter((t) => t.reason !== 'WORKSPACE_DISABLED' && t.reason !== 'PARENT_DISABLED');

  const currentTab: TabId = visible.some((t) => t.id === requested) ? requested : (visible[0]?.id ?? 'overview');

  const renderBody = (id: TabId) => {
    switch (id) {
      case 'overview':
      case 'calendar':
      case 'appointments':
        return <UnifiedSchedulingWorkspace />;
      case 'booking-requests':
        return (
          <AppointmentRosterTab
            title="Online Booking Requests"
            description="Review and confirm appointment requests from your website."
            filterFn={(a) => a.status === 'Pending'}
            emptyLabel="No pending requests"
            onSelect={setSelectedAppointment}
          />
        );
      case 'check-in':
        return (
          <AppointmentRosterTab
            title="Today's Check-Ins"
            description="Appointments scheduled for today that need to be checked in."
            filterFn={(a) => a.status === 'Confirmed'} // In a real app we'd also check isToday(parseISO(a.date))
            emptyLabel="No appointments to check in"
            onSelect={setSelectedAppointment}
          />
        );
      case 'no-shows':
        return (
          <AppointmentRosterTab
            title="No-Shows & Cancellations"
            description="Track missed appointments and cancellation fees."
            filterFn={(a) => a.status === 'Cancelled'} // In a real app we might also check past pending
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
              <h3 className="text-lg font-bold text-stone-900">Appointment Types & Counts</h3>
              <p className="text-sm text-stone-500">Distribution of your appointments by type.</p>
            </div>
            <div className="divide-y divide-stone-100">
              {APPOINTMENT_TYPES.map((type) => {
                const count = appointments.filter((a) => a.type === type).length;
                return (
                  <div key={type} className="px-6 py-4 flex items-center justify-between hover:bg-stone-50">
                    <span className="font-medium text-stone-900">{type}</span>
                    <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-sm font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'reminders':
        return (
          <AppointmentRosterTab
            title="Automated Reminders"
            description="Upcoming appointments that will receive reminder notifications."
            filterFn={(a) => a.status === 'Confirmed' || a.status === 'Pending'}
            emptyLabel="No upcoming appointments for reminders"
            onSelect={setSelectedAppointment}
          />
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
                <p className="text-sm text-stone-500">Share this link with clients to allow them to book online.</p>
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
      case 'resources':
        return (
          <div className="p-8 text-center bg-white border border-stone-200 rounded-xl">
             <h3 className="font-bold text-stone-900 mb-2">Fitting Rooms & Resources</h3>
             <p className="text-stone-500 mb-4">Configure store zones, dressing rooms, and shared equipment.</p>
             <Button variant="outline" onClick={() => navigate('/settings?tab=scheduling')}>Configure Resources</Button>
          </div>
        );
      default:
        return <UnifiedSchedulingWorkspace />;
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 shrink-0">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Appointments</h1>
          <p className="text-stone-500">Manage your store schedule and incoming requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/settings?tab=scheduling')} className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button variant="default" className="gap-2" onClick={() => setIsBookModalOpen(true)}>
            New Appointment
          </Button>
        </div>
      </div>
      
      <Tabs value={currentTab} onValueChange={setTab} className="w-full flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide shrink-0">
          <TabsList className="bg-stone-100 flex-nowrap inline-flex">
            {visible.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="whitespace-nowrap flex items-center gap-1.5">
                {t.label} {!t.effective && <Lock className="h-3 w-3 text-stone-300" />}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {visible.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-6 flex-1 min-h-0">
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
    </div>
  );
}
