import { useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '../ui';
import { SettingsNavigation, SettingsTab, SETTINGS_GROUPS } from './SettingsNavigation';
import { StickySaveBar } from './components/StickySaveBar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@vowos/design-system';
import { OrgSettingsTab } from './tabs/OrganizationSettings';
import { FeaturesAndModulesTab } from './tabs/FeaturesAndModulesTab';
import { LocationSettingsTab } from './tabs/LocationSettings';
import { PaymentsSettingsTab } from './tabs/PaymentsSettings';
import { BookingSettingsTab } from './tabs/BookingSettings';
import { AvailabilityRulesTab } from './tabs/AvailabilityRulesTab';
import { AlterationsSettingsTab } from './tabs/AlterationsSettingsTab';
import { SalesSettingsTab } from './tabs/SalesSettingsTab';
import { CommissionSettingsTab } from './tabs/CommissionSettingsTab';
import { InventorySettingsTab } from './tabs/InventorySettingsTab';
import { PurchasingSettingsTab } from './tabs/PurchasingSettingsTab';
import { TransfersSettingsTab } from './tabs/TransfersSettingsTab';
import { CommunicationsSettingsTab } from './tabs/CommunicationsSettingsTab';
import { AutomationsSettingsTab } from './tabs/AutomationsSettingsTab';
import { NotificationsSettingsTab } from './tabs/NotificationsSettingsTab';
import { DocumentsSettingsTab } from './tabs/DocumentsSettingsTab';
import { IntegrationsSettingsTab } from './tabs/IntegrationsSettingsTab';
import { ReportingSettingsTab } from './tabs/ReportingSettingsTab';
import { SecuritySettingsTab } from './tabs/SecuritySettingsTab';
import { DataSettingsTab } from './tabs/DataSettingsTab';
import { AuditSettingsTab } from './tabs/AuditSettingsTab';
import { SystemHealthSettingsTab } from './tabs/SystemHealthSettingsTab';
import { FeatureFlagsSettingsTab } from './tabs/FeatureFlagsSettingsTab';
import AIModelSettingsTab from './tabs/AIModelSettingsTab';
import { SubscriptionsSettingsTab } from './tabs/SubscriptionsSettingsTab';
import DataMigrationTab from './tabs/DataMigrationTab';
import GoLiveChecklist from './tabs/GoLiveChecklist';
import { Search } from 'lucide-react';
import { inputCls } from '../ui';

export default function SettingsShell() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'organization';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync activeTab to URL
  useEffect(() => {
    if (activeTab !== searchParams.get('tab')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', activeTab);
      setSearchParams(newParams, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Ref to hold the save function of the active tab
  const saveFnRef = useRef<(() => Promise<boolean>) | null>(null);

  const registerSaveFn = (fn: () => Promise<boolean>) => {
    saveFnRef.current = fn;
  };

  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);

  const handleTabChange = (tab: SettingsTab) => {
    if (isDirty) {
      setPendingTab(tab);
    } else {
      setActiveTab(tab);
    }
  };

  const confirmTabChange = () => {
    if (pendingTab) {
      setIsDirty(false);
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  const cancelTabChange = () => {
    setPendingTab(null);
  };

  const handleSave = async (reason?: string) => {
    if (saveFnRef.current) {
      setSaving(true);
      const ok = await saveFnRef.current(reason);
      setSaving(false);
      if (ok) {
        setIsDirty(false);
      }
    }
  };

  const handleCancel = () => {
    // Increment resetTrigger to trigger a reload in the active tab
    setResetTrigger((prev) => prev + 1);
    setIsDirty(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'organization':
        return (
          <OrgSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'modules':
        return (
          <FeaturesAndModulesTab />
        );
      case 'locations':
        return (
          <LocationSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'payments':
        return (
          <PaymentsSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'booking':
        return (
          <BookingSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'scheduling':
        return (
          <AvailabilityRulesTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'alterations':
        return (
          <AlterationsSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'sales':
        return (
          <SalesSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'commission':
        return (
          <CommissionSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'inventory':
        return (
          <InventorySettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'purchasing':
        return (
          <PurchasingSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'transfers':
        return (
          <TransfersSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'communications':
        return (
          <CommunicationsSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'automations':
        return (
          <AutomationsSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'notifications':
        return (
          <NotificationsSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'documents':
        return (
          <DocumentsSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'integrations':
        return (
          <IntegrationsSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'reporting':
        return (
          <ReportingSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'security':
        return (
          <SecuritySettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'data':
        return (
          <DataMigrationTab />
        );
      case 'go-live':
        return (
          <GoLiveChecklist />
        );
      case 'audit':
        return (
          <AuditSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'system-health':
        return (
          <SystemHealthSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'feature-flags':
        return (
          <FeatureFlagsSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'ai-models':
        return (
          <AIModelSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      case 'subscriptions':
        return (
          <SubscriptionsSettingsTab
            onDirtyChange={setIsDirty}
            registerSaveRef={registerSaveFn}
            resetTrigger={resetTrigger}
          />
        );
      default:
        saveFnRef.current = null;
        return null;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'organization': return 'Organization Settings';
      case 'modules': return 'Workspace Modules';
      case 'locations': return 'Location Configuration';
      case 'payments': return 'Payments & Taxes';
      case 'booking': return 'Online Booking';
      case 'scheduling': return 'Availability Rules';
      case 'alterations': return 'Alterations & Pickups';
      case 'sales': return 'Sales & Invoicing';
      case 'commission': return 'Commission Plans';
      case 'inventory': return 'Inventory Rules';
      case 'purchasing': return 'Purchasing & Vendor';
      case 'transfers': return 'Store Transfers';
      case 'communications': return 'Channels & Twilio';
      case 'automations': return 'Automation Rules';
      case 'notifications': return 'Notifications';
      case 'documents': return 'Documents & Templates';
      case 'integrations': return 'Integrations & AI';
      case 'reporting': return 'Reporting Settings';
      case 'security': return 'Security Policy';
      case 'data': return 'Data & Import';
      case 'audit': return 'Audit Log';
      case 'system-health': return 'System Health';
      case 'feature-flags': return 'Feature Flags';
      case 'subscriptions': return 'Subscription & Modules';
      default:
        return activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ');
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'organization': return 'Manage corporate settings and primary parameters.';
      case 'modules': return 'Toggle visibility of top-level workspace modules.';
      case 'locations': return 'Configure storefront boutiques, individual operating hours and holidays.';
      case 'payments': return 'Control payment methods, card processing surcharges, and tax jurisdictions.';
      case 'booking': return 'Establish availability noticed, booking limits, and intake questions.';
      case 'scheduling': return 'Set up default durations, cooldown buffers, and booking thresholds.';
      case 'alterations': return 'Define alterations pricing, fitting schedules, and pickup templates.';
      case 'sales': return 'Configure numbering formats, discount guidelines, and standard terms.';
      case 'commission': return 'Establish tiered commission rates andGoal-based bonuses.';
      case 'inventory': return 'Manage SKU formats, barcode symbologies, and stock targets.';
      case 'purchasing': return 'Configure designer lead times, contacts, and purchase orders.';
      case 'transfers': return 'Set store transfer rules, approval thresholds, and packaging parameters.';
      case 'communications': return 'Expose Twilio SID, verify webhook loops, and configure channels.';
      case 'automations': return 'Manage automated triggers for SMS followups and client reminders.';
      case 'notifications': return 'Define default staff category and location notification preferences.';
      case 'documents': return 'Configure layouts, terms of sale, and typography of PDF outputs.';
      case 'integrations': return 'Link third party services and configure OpenAI models.';
      case 'reporting': return 'Configure fiscal calendar start dates and cost visibility guidelines.';
      case 'security': return 'Establish password complexities, lockout limits, and session lifespan.';
      case 'data': return 'Manage data retention limits and spreadsheet import matching.';
      case 'go-live': return 'Complete your store setup and prepare for launch.';
      case 'audit': return 'Timeline of setting changes, actors, and reasons.';
      case 'system-health': return 'Monitor database connection state, integration adapters, and run checks.';
      case 'feature-flags': return 'Enable experimental rollouts for testing new features.';
      case 'subscriptions': return 'Manage your VowOS subscription, billing, and toggle optional add-on modules.';
      default:
        return 'Manage and configure VowOS platform options.';
    }
  };

  // Determine if active tab is sensitive
  const isSensitiveTab = ['organization', 'payments', 'security', 'integrations'].includes(activeTab);

  return (
    <div className="min-h-screen bg-stone-50/50 pb-24">
      <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto">
        
        {/* Left Column: Settings Navigation Menu */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputCls} pl-9`}
            />
          </div>

          {/* Mobile Select Navigation */}
          <div className="lg:hidden">
            <select
              value={activeTab}
              onChange={(e) => handleTabChange(e.target.value as SettingsTab)}
              className={`${inputCls} w-full font-medium text-stone-700 shadow-sm`}
            >
              {SETTINGS_GROUPS.map((group) => {
                const role = profile?.role || 'Stylist';
                const visibleItems = group.items.filter((item) => {
                  if (!item.roles.includes(role)) return false;
                  if (searchQuery.trim()) {
                    const query = searchQuery.toLowerCase();
                    return (
                      item.label.toLowerCase().includes(query) ||
                      item.keywords.some((kw) => kw.toLowerCase().includes(query))
                    );
                  }
                  return true;
                });
                if (visibleItems.length === 0) return null;
                return (
                  <optgroup key={group.group} label={group.group}>
                    {visibleItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Desktop Navigation Menu */}
          <div data-tour-id="tabs-settings" className="hidden lg:block rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
            <SettingsNavigation
              activeTab={activeTab}
              onTabChange={handleTabChange}
              userRole={profile?.role || 'Stylist'}
              searchQuery={searchQuery}
            />
          </div>
        </div>

        {/* Right Column: Settings Tab Content */}
        <div data-tour-id="card-settings-active" className="flex-1 space-y-6">
          <PageHeader
            title={getTabTitle()}
            subtitle={getTabSubtitle()}
          />
          {renderTabContent()}
        </div>
      </div>

      <StickySaveBar
        show={isDirty}
        saving={saving}
        onSave={handleSave}
        onCancel={handleCancel}
        isSensitive={isSensitiveTab}
      />

      <AlertDialog open={pendingTab !== null} onOpenChange={(open) => !open && cancelTabChange()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes on this page. If you leave, your changes will be lost. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTabChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTabChange} className="bg-brand-primary-hover hover:bg-rose-700 text-white">
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
