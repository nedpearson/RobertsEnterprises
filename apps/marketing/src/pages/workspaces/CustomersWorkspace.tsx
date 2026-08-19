import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { Lock } from 'lucide-react';
import { useModuleResolution } from '@/lib/modules/resolver';
import CustomersView from '@/components/vowos/CustomersView';
import CommunicationsView from '@/components/vowos/CommunicationsView';
import CustomerRosterTab from '@/components/vowos/customers/CustomerRosterTab';
import { formatCents, formatDate } from '@/data/vowosData';

/**
 * Customers workspace — the consolidated home for every customer feature.
 *
 * Tabs are gated by the module system (Settings -> Modules). A tab whose module
 * is turned off simply disappears from the bar; a tab the plan does not include
 * renders ModuleLocked. Nothing is a "capabilities are loading" stub — every
 * enabled tab renders real, data-backed content, and the roster lenses drill
 * into the shared Bride360View so they share one source of truth.
 */
const TABS = [
  { id: 'customers', label: 'Customers', module: 'customers.core' },
  { id: 'customer-360', label: 'Customer 360', module: 'customers.core' },
  { id: 'inbox', label: 'Inbox', module: 'communications.core' },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { resolveFeatureAvailability } = useModuleResolution();

  const requested = (searchParams.get('tab') as TabId) || 'customers';

  // A tab is visible unless its module is turned OFF in Settings -> Modules.
  // UNENTITLED still shows (rendered as a locked upsell); WORKSPACE_DISABLED hides.
  const resolved = TABS.map((t) => {
    const r = resolveFeatureAvailability(t.module);
    return { ...t, effective: r.effective, reason: r.reason };
  });
  const visible = resolved.filter((t) => t.reason !== 'WORKSPACE_DISABLED' && t.reason !== 'PARENT_DISABLED');

  const tab: TabId = visible.some((t) => t.id === requested) ? requested : (visible[0]?.id ?? 'customers');

  const renderBody = (id: TabId) => {
    switch (id) {
      case 'customers':
      case 'customer-360':
        return <CustomersView />;
      case 'inbox':
        return <CommunicationsView />;
      case 'follow-ups':
        return (
          <CustomerRosterTab
            title="Follow-Ups"
            description="Active brides with an upcoming wedding — reach out before the next milestone."
            openTab="overview"
            filter={(c) => c.status === 'Active' || c.status === 'Alterations'}
            sort={(a, b) => (a.weddingDate || '').localeCompare(b.weddingDate || '')}
            columns={[{ header: 'Stylist', render: (c) => c.stylist || '—' }]}
            emptyLabel="No follow-ups due"
          />
        );
      case 'style-profiles':
        return (
          <CustomerRosterTab
            title="Style Profiles"
            description="Silhouette, designer and aesthetic preferences per bride."
            openTab="gown"
            columns={[{ header: 'Stylist', render: (c) => c.stylist || '—' }]}
            emptyLabel="No style profiles yet"
          />
        );
      case 'measurements':
        return (
          <CustomerRosterTab
            title="Measurements"
            description="Fitting measurements and try-on notes, per bride."
            openTab="gown"
            filter={(c) => c.status === 'Alterations' || c.status === 'Purchased' || c.status === 'Active'}
            emptyLabel="No measurements recorded"
          />
        );
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
            filter={(c) => c.spendCents > 0}
            columns={[{ header: 'Lifetime spend', className: 'text-right', render: (c) => formatCents(c.spendCents) }]}
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
        return (
          <CustomerRosterTab
            title="Customer Portal"
            description="Each bride's private portal — copy or share their link."
            openTab="overview"
            showPortal
            columns={[{ header: 'Wedding', render: (c) => (c.weddingDate ? formatDate(c.weddingDate) : '—') }]}
            emptyLabel="No portal-enabled brides"
          />
        );
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

      <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v })} className="w-full">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="bg-stone-100 flex-nowrap inline-flex">
            {visible.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="whitespace-nowrap flex items-center gap-1.5">
                {t.label} {!t.effective && <Lock className="h-3 w-3 text-stone-300" />}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {visible.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-6">
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
    </div>
  );
}
