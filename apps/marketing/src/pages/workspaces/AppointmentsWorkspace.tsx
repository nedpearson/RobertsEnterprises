import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, Settings, ExternalLink, Lock } from 'lucide-react';
import { UnifiedSchedulingWorkspace } from '@/pages/scheduling/UnifiedSchedulingWorkspace';
import { useDemo } from '@/lib/demo/demoContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';

export default function AppointmentsWorkspace() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'calendar';
  const { can } = useTenantEntitlements();
  
  const bookingUrlPath = isDemoMode ? '/demoapp/book' : '/book';
  const fullBookingUrl = `${window.location.origin}${bookingUrlPath}`;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', module: 'scheduling.core' },
    { id: 'calendar', label: 'Calendar', module: 'scheduling.core' },
    { id: 'appointments', label: 'Appointments', module: 'scheduling.core' },
    { id: 'booking-requests', label: 'Booking Requests', module: 'scheduling.core' },
    { id: 'online-booking', label: 'Online Booking', module: 'scheduling.online' },
    { id: 'availability', label: 'Availability', module: 'scheduling.core' },
    { id: 'appointment-types', label: 'Appointment Types', module: 'scheduling.core' },
    { id: 'resources', label: 'Resources', module: 'scheduling.resources' },
    { id: 'reminders', label: 'Reminders', module: 'communications.automations' },
    { id: 'check-in', label: 'Check-In', module: 'scheduling.core' },
    { id: 'no-shows', label: 'No-Shows', module: 'scheduling.core' },
    { id: 'follow-up', label: 'Follow-Up', module: 'scheduling.core' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-col space-y-1">
          <h1 className="text-2xl font-serif font-bold text-stone-900">Appointments</h1>
          <p className="text-stone-500">Manage your scheduling and bookings.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => window.open(fullBookingUrl, '_blank')} className="text-stone-700">
            <ExternalLink className="mr-2 h-4 w-4" /> Open Booking
          </Button>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(fullBookingUrl); toast.success('Link copied'); }} className="text-stone-700">
            <Copy className="mr-2 h-4 w-4" /> Copy Link
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/settings?tab=booking')} className="text-stone-700">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="bg-stone-100 flex-nowrap inline-flex">
            {tabs.map(t => (
              <TabsTrigger key={t.id} value={t.id} className="whitespace-nowrap flex items-center gap-1.5">
                {t.label} {!can(t.module) && <Lock className="h-3 w-3 text-stone-300" />}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="calendar" className="mt-6"><UnifiedSchedulingWorkspace /></TabsContent>
        <TabsContent value="appointments" className="mt-6"><UnifiedSchedulingWorkspace /></TabsContent>
        <TabsContent value="overview" className="mt-6"><UnifiedSchedulingWorkspace /></TabsContent>

        {tabs.filter(t => !['calendar', 'appointments', 'overview'].includes(t.id)).map(t => (
          <TabsContent key={t.id} value={t.id} className="mt-6">
            {!can(t.module) ? (
               <ModuleLocked title={t.label} description="This feature is available as an upgrade to your current plan." />
            ) : (
               <div className="p-12 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-100">
                 {t.label} capabilities are loading...
               </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
