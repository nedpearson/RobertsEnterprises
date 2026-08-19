import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, Settings, ExternalLink } from 'lucide-react';
import { UnifiedSchedulingWorkspace } from '@/pages/scheduling/UnifiedSchedulingWorkspace';
import { useDemo } from '@/lib/demo/demoContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { FeatureKey } from '@/lib/features/featureCatalog';

interface AppointmentsTabDef {
  id: string;
  label: string;
  module: FeatureKey;
}

const APPOINTMENTS_TABS: AppointmentsTabDef[] = [
  { id: 'calendar', label: 'Calendar', module: 'appointments' },
  { id: 'fitting-rooms', label: 'Fitting Rooms', module: 'appointments.fitting_rooms' }
];

export default function AppointmentsWorkspace() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useTenantEntitlements();
  
  const bookingUrlPath = isDemoMode ? '/demoapp/book' : '/book';
  const fullBookingUrl = `${window.location.origin}${bookingUrlPath}`;

  const availableTabs = useMemo(() => {
    return APPOINTMENTS_TABS.filter(tab => can(tab.module));
  }, [can]);

  const defaultTab = availableTabs.length > 0 ? availableTabs[0].id : 'calendar';
  const currentTab = searchParams.get('tab') || defaultTab;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (availableTabs.length === 0) {
    return <div className="p-8 text-center text-stone-500">You do not have access to appointments.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
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
      
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-stone-100 overflow-x-auto flex-nowrap w-full justify-start">
          {availableTabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="shrink-0">{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <UnifiedSchedulingWorkspace />
        </TabsContent>
        <TabsContent value="fitting-rooms" className="mt-6">
          <div className="p-12 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-100">
            Fitting room management capabilities are loading...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
