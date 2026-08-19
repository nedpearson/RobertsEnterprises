import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, Settings, Lock } from 'lucide-react';
import { UnifiedSchedulingWorkspace } from '@/pages/scheduling/UnifiedSchedulingWorkspace';
import { useDemo } from '@/lib/demo/demoContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { useModuleResolution } from '@/lib/modules/resolver';
import { useVowosData } from '@/contexts/VowosDataContext';
import RosterTab from '@/components/vowos/shared/RosterTab';
import { Appointment360Panel } from '@/pages/scheduling/Appointment360Panel';
import { Appointment } from '@/data/vowosData';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from '@/components/vowos/ui';

const TABS = [
  { id: 'calendar', label: 'Calendar', module: 'scheduling.core' },
  { id: 'booking-requests', label: 'Booking Requests', module: 'scheduling.online' },
  { id: 'check-in', label: 'Check-In', module: 'scheduling.core' },
  { id: 'no-shows', label: 'No-Shows', module: 'scheduling.core' },
  { id: 'follow-up', label: 'Follow-Up', module: 'scheduling.core' },
  { id: 'appointment-types', label: 'Appointment Types', module: 'scheduling.core' },
  { id: 'resources', label: 'Fitting Rooms', module: 'scheduling.resources' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AppointmentsWorkspace() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const [searchParams, setSearchParams] = useSearchParams();
  const { resolveFeatureAvailability } = useModuleResolution();
  const { appointments, brides } = useVowosData();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  const bookingUrlPath = isDemoMode ? '/demoapp/book' : '/book';
  const fullBookingUrl = `${window.location.origin}${bookingUrlPath}`;

  const requested = (searchParams.get('tab') as TabId) || 'calendar';

  const resolved = TABS.map((t) => {
    const r = resolveFeatureAvailability(t.module);
    return { ...t, effective: r.effective, reason: r.reason };
  });
  const visible = resolved.filter((t) => t.reason !== 'WORKSPACE_DISABLED' && t.reason !== 'PARENT_DISABLED');

  const currentTab: TabId = visible.some((t) => t.id === requested) ? requested : (visible[0]?.id ?? 'calendar');

  const getCustomerName = (customerId: string) => {
    const bride = brides.find(b => b.id === customerId);
    return bride ? bride.name : 'Walk-in';
  };

  const renderBody = (id: TabId) => {
    switch (id) {
      case 'calendar':
        return <UnifiedSchedulingWorkspace />;
      case 'booking-requests':
        return (
          <RosterTab<Appointment>
            title="Online Booking Requests"
            description="Review and confirm appointment requests from your website."
            data={appointments}
            filter={(a) => a.status === 'Pending'}
            primaryKey={(a) => a.id}
            searchPredicate={(a, term) => getCustomerName(a.customer).toLowerCase().includes(term)}
            onRowClick={setSelectedAppointment}
            emptyLabel="No pending requests"
            columns={[
              { header: 'Client', render: (a) => <span className="font-bold">{getCustomerName(a.customer)}</span> },
              { header: 'Type', render: (a) => a.type },
              { header: 'Requested Date', render: (a) => format(parseISO(a.date), 'MMM d, yyyy h:mm a') },
              { header: 'Status', render: (a) => <StatusBadge status="Pending" /> },
            ]}
          />
        );
      case 'check-in':
        return (
          <RosterTab<Appointment>
            title="Today's Check-Ins"
            description="Appointments scheduled for today that need to be checked in."
            data={appointments}
            filter={(a) => a.status === 'Confirmed'}
            primaryKey={(a) => a.id}
            searchPredicate={(a, term) => getCustomerName(a.customer).toLowerCase().includes(term)}
            onRowClick={setSelectedAppointment}
            emptyLabel="No appointments to check in"
            columns={[
              { header: 'Time', render: (a) => format(parseISO(a.date), 'h:mm a') },
              { header: 'Client', render: (a) => <span className="font-bold">{getCustomerName(a.customer)}</span> },
              { header: 'Type', render: (a) => a.type },
              { header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
            ]}
          />
        );
      case 'no-shows':
        return (
          <RosterTab<Appointment>
            title="No-Shows & Cancellations"
            description="Track missed appointments and cancellation fees."
            data={appointments}
            filter={(a) => a.status === 'Cancelled'}
            primaryKey={(a) => a.id}
            searchPredicate={(a, term) => getCustomerName(a.customer).toLowerCase().includes(term)}
            onRowClick={setSelectedAppointment}
            emptyLabel="No missed appointments"
            columns={[
              { header: 'Client', render: (a) => <span className="font-bold">{getCustomerName(a.customer)}</span> },
              { header: 'Date', render: (a) => format(parseISO(a.date), 'MMM d, yyyy') },
              { header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
            ]}
          />
        );
      case 'follow-up':
        return (
          <RosterTab<Appointment>
            title="Appointment Follow-Ups"
            description="Completed appointments requiring post-visit outreach."
            data={appointments}
            filter={(a) => a.status === 'Completed'}
            primaryKey={(a) => a.id}
            searchPredicate={(a, term) => getCustomerName(a.customer).toLowerCase().includes(term)}
            onRowClick={setSelectedAppointment}
            emptyLabel="No follow-ups needed"
            columns={[
              { header: 'Client', render: (a) => <span className="font-bold">{getCustomerName(a.customer)}</span> },
              { header: 'Date', render: (a) => format(parseISO(a.date), 'MMM d, yyyy') },
              { header: 'Stylist', render: (a) => a.stylist },
            ]}
          />
        );
      case 'appointment-types':
        return (
          <div className="p-8 text-center bg-white border border-stone-200 rounded-xl">
             <h3 className="font-bold text-stone-900 mb-2">Appointment Types Configuration</h3>
             <p className="text-stone-500 mb-4">Manage durations, buffers, and descriptions for your services.</p>
             <Button variant="outline" onClick={() => navigate('/settings?tab=appointments')}>Go to Settings</Button>
          </div>
        );
      case 'resources':
        return (
          <div className="p-8 text-center bg-white border border-stone-200 rounded-xl">
             <h3 className="font-bold text-stone-900 mb-2">Fitting Rooms & Resources</h3>
             <p className="text-stone-500 mb-4">Configure store zones, dressing rooms, and shared equipment.</p>
             <Button variant="outline" onClick={() => navigate('/settings?tab=appointments')}>Configure Resources</Button>
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
          <Button variant="outline" onClick={() => {
            navigator.clipboard.writeText(fullBookingUrl);
            toast.success('Booking URL copied to clipboard');
          }} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy URL
          </Button>
          <Button variant="outline" onClick={() => navigate('/settings?tab=appointments')} className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button variant="default" className="gap-2">
            New Appointment
          </Button>
        </div>
      </div>
      
      <Tabs value={currentTab} onValueChange={(v) => setSearchParams({ tab: v })} className="w-full flex-1 flex flex-col min-h-0">
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
    </div>
  );
}
