import { useWorkspaceTab } from '@/lib/navigation/useWorkspaceTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { Lock } from 'lucide-react';
import { useModuleResolution } from '@/lib/modules/resolver';
import CustomersView from '@/components/vowos/CustomersView';
import CommunicationsView from '@/components/vowos/CommunicationsView';
import CustomerRosterTab from '@/components/vowos/customers/CustomerRosterTab';
import AutomatedRemindersView from '@/components/vowos/customers/AutomatedRemindersView';
import { CustomerPortalView, MeasurementsView, StyleProfilesView } from '@/components/vowos/customers/CustomerModuleViews';
import { formatCents } from '@/data/vowosData';

/**
 * Customers workspace — the consolidated home for every customer feature.
 *
 * Tabs are gated by the module system (Settings -> Modules). Dedicated modules
 * render their own persisted operational surfaces; generic roster lenses remain
 * only for views that intentionally summarize the shared customer record.
 */
const TABS = [
  { id: 'customers', label: 'Customers', module: 'customers.core' },
  { id: 'customer-360', label: 'Customer 360', module: 'customers.core' },
  { id: 'inbox', label: 'Inbox', module: 'communications.core' },
  { id: 'automations', label: 'Automations', module: 'communications.automations' },
  { id: 'follow-ups', label: 'Follow-Ups', module: 'customers.core' },
  { id: 'style-profiles', label: 'Style Profiles', module: 'customers.style_profiles' },
  { id: 'measurements', label: 'Measurements', module: 'customers.measurements' },
  { id: 'try-ons', label: 'Try-Ons', module: 'customers.core' },
  { id: 'favorites', label: 'Favorites', module: 'customers.portal' },
  { id: 'files', label: 'Files', module: 'customers.core' },
  { id: 'customer-portal', label: 'Customer Portal', module: 'customers.portal' },
  { id: 'timeline', label: 'Timeline', module: 'customers.core' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function CustomersWorkspace() {
  const { requestedTab, setTab } = useWorkspaceTab('customers', 'customers');
  const { resolveFeatureAvailability } = useModuleResolution();
  const requested = requestedTab as TabId;

  const resolved = TABS.map((entry) => {
    const resolution = resolveFeatureAvailability(entry.module);
    return { ...entry, effective: resolution.effective, reason: resolution.reason };
  });
  const visible = resolved.filter((entry) => entry.reason !== 'WORKSPACE_DISABLED' && entry.reason !== 'PARENT_DISABLED');
  const tab: TabId = visible.some((entry) => entry.id === requested) ? requested : (visible[0]?.id ?? 'customers');

  const renderBody = (id: TabId) => {
    switch (id) {
      case 'customers':
      case 'customer-360':
        return <CustomersView />;
      case 'inbox':
        return <CommunicationsView />;
      case 'automations':
        return <AutomatedRemindersView />;
      case 'follow-ups':
        return (
          <CustomerRosterTab
            title="Follow-Ups"
            description="Active brides with an upcoming wedding — reach out before the next milestone."
            openTab="overview"
            filter={(customer) => customer.status === 'Active' || customer.status === 'Alterations'}
            sort={(a, b) => (a.weddingDate || '').localeCompare(b.weddingDate || '')}
            columns={[{ header: 'Stylist', render: (customer) => customer.stylist || '—' }]}
            emptyLabel="No follow-ups due"
          />
        );
      case 'style-profiles':
        return <StyleProfilesView />;
      case 'measurements':
        return <MeasurementsView />;
      case 'try-ons':
        return (
          <CustomerRosterTab
            title="Try-Ons"
            description="Brides who have tried on gowns — review their appointment history."
            openTab="appointments"
            emptyLabel="No try-ons yet"
          />
        );
      case 'favorites':
        return (
          <CustomerRosterTab
            title="Favorites / VIP"
            description="Highest-value clients by lifetime spend."
            openTab="overview"
            sort={(a, b) => b.spendCents - a.spendCents}
            filter={(customer) => customer.spendCents > 0}
            columns={[{ header: 'Lifetime spend', className: 'text-right', render: (customer) => formatCents(customer.spendCents) }]}
            emptyLabel="No VIP clients yet"
          />
        );
      case 'files':
        return (
          <CustomerRosterTab
            title="Files"
            description="Contracts, receipts and documents attached to each bride."
            openTab="documents"
            emptyLabel="No files on record"
          />
        );
      case 'customer-portal':
        return <CustomerPortalView />;
      case 'timeline':
        return (
          <CustomerRosterTab
            title="Timeline"
            description="Full communication and activity history per bride."
            openTab="messages"
            emptyLabel="No activity yet"
          />
        );
      default:
        return <CustomersView />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-serif font-bold text-stone-900">Customers</h1>
        <p className="text-stone-500">Manage brides, communications, and relationships.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="bg-stone-100 flex-nowrap inline-flex">
            {visible.map((entry) => (
              <TabsTrigger key={entry.id} value={entry.id} className="whitespace-nowrap flex items-center gap-1.5">
                {entry.label} {!entry.effective && <Lock className="h-3 w-3 text-stone-300" />}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {visible.map((entry) => (
          <TabsContent key={entry.id} value={entry.id} className="mt-6">
            {entry.effective ? renderBody(entry.id) : (
              <ModuleLocked title={entry.label} description="This feature is available as an upgrade to your current plan." />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
