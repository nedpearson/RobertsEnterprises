import { ReactNode } from 'react';
import {
  Building,
  MapPin,
  Calendar,
  MousePointerClick,
  CreditCard,
  Receipt,
  Percent,
  Shirt,
  ShoppingBag,
  ArrowLeftRight,
  Scissors,
  MessageSquare,
  Zap,
  Bell,
  FileText,
  Plug,
  BarChart3,
  ShieldAlert,
  Database,
  History,
  Activity,
  Flag,
  Cpu,
  Crown,
  CheckSquare,
} from 'lucide-react';

export type SettingsTab =
  | 'organization'
  | 'locations'
  | 'scheduling'
  | 'booking'
  | 'payments'
  | 'sales'
  | 'commission'
  | 'inventory'
  | 'purchasing'
  | 'transfers'
  | 'alterations'
  | 'communications'
  | 'automations'
  | 'notifications'
  | 'documents'
  | 'integrations'
  | 'reporting'
  | 'security'
  | 'data'
  | 'audit'
  | 'system-health'
  | 'feature-flags'
  | 'ai-models'
  | 'subscriptions'
  | 'go-live';

export interface SettingsCategory {
  group: string;
  items: {
    id: SettingsTab;
    label: string;
    icon: typeof Building;
    roles: string[];
    keywords: string[];
  }[];
}

export const SETTINGS_GROUPS: SettingsCategory[] = [
  {
    group: 'General & Stores',
    items: [
      { id: 'organization', label: 'Organization', icon: Building, roles: ['Owner'], keywords: ['name', 'logo', 'business', 'company', 'contact'] },
      { id: 'locations', label: 'Locations', icon: MapPin, roles: ['Owner', 'Manager'], keywords: ['store', 'boutique', 'address', 'hours', 'holidays', 'timezone'] },
      { id: 'reporting', label: 'Reporting Settings', icon: BarChart3, roles: ['Owner', 'Manager'], keywords: ['fiscal', 'calendar', 'cost', 'metrics', 'goals'] },
      { id: 'subscriptions', label: 'Subscription & Modules', icon: Crown, roles: ['Owner'], keywords: ['plan', 'billing', 'modules', 'features', 'upgrade', 'downgrade', 'addons'] },
    ],
  },
  {
    group: 'Scheduling & Booking',
    items: [
      { id: 'scheduling', label: 'Availability Rules', icon: Calendar, roles: ['Owner', 'Manager'], keywords: ['calendar', 'durations', 'buffers', 'cooldown', 'staff'] },
      { id: 'booking', label: 'Online Booking', icon: MousePointerClick, roles: ['Owner', 'Manager'], keywords: ['appointments', 'intake', 'questions', 'limits', 'portal'] },
      { id: 'alterations', label: 'Alterations & Pickups', icon: Scissors, roles: ['Owner', 'Manager'], keywords: ['seamstress', 'fittings', 'pickup', 'pricing', 'schedule'] },
    ],
  },
  {
    group: 'Finance & Payments',
    items: [
      { id: 'payments', label: 'Payments & Taxes', icon: CreditCard, roles: ['Owner', 'Manager'], keywords: ['credit card', 'surcharge', 'taxes', 'jurisdiction', 'gateway', 'stripe'] },
      { id: 'sales', label: 'Sales & Invoicing', icon: Receipt, roles: ['Owner', 'Manager'], keywords: ['discounts', 'terms', 'invoice formats', 'numbering', 'receipts'] },
      { id: 'commission', label: 'Commission Plans', icon: Percent, roles: ['Owner'], keywords: ['bonuses', 'tiers', 'stylist pay', 'goals', 'rates'] },
    ],
  },
  {
    group: 'Operations & Supply',
    items: [
      { id: 'inventory', label: 'Inventory Rules', icon: Shirt, roles: ['Owner', 'Manager'], keywords: ['sku', 'barcodes', 'stock', 'targets', 'categories'] },
      { id: 'purchasing', label: 'Purchasing & Vendor', icon: ShoppingBag, roles: ['Owner', 'Manager'], keywords: ['designers', 'lead times', 'purchase orders', 'po', 'vendors'] },
      { id: 'transfers', label: 'Store Transfers', icon: ArrowLeftRight, roles: ['Owner', 'Manager'], keywords: ['movement', 'approval', 'packaging', 'transit'] },
    ],
  },
  {
    group: 'Comms & Automation',
    items: [
      { id: 'communications', label: 'Channels & Twilio', icon: MessageSquare, roles: ['Owner', 'Manager'], keywords: ['sms', 'email', 'twilio', 'inbox', 'messaging'] },
      { id: 'automations', label: 'Automation Rules', icon: Zap, roles: ['Owner', 'Manager'], keywords: ['triggers', 'reminders', 'followup', 'workflow', 'auto'] },
      { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['Owner', 'Manager', 'Stylist', 'Front Desk'], keywords: ['alerts', 'push', 'preferences', 'sounds'] },
      { id: 'documents', label: 'Documents & Templates', icon: FileText, roles: ['Owner', 'Manager'], keywords: ['pdf', 'contracts', 'quotes', 'typography', 'branding', 'files'] },
    ],
  },
  {
    group: 'System & Security',
    items: [
      { id: 'integrations', label: 'Integrations & AI', icon: Plug, roles: ['Owner'], castAs: undefined, keywords: ['stripe', 'oauth', 'api', 'copilot', 'models', 'openai'] },
      { id: 'ai-models', label: 'AI Model Management', icon: Cpu, roles: ['Owner'], keywords: ['routing', 'benchmark', 'gemini', 'anthropic', 'latency', 'quality'] },
      { id: 'security', label: 'Security Policy', icon: ShieldAlert, roles: ['Owner'], keywords: ['password', 'mfa', 'totp', 'ip', 'whitelist', 'session', 'lockout'] },
      { id: 'data', label: 'Data Migration', icon: Database, roles: ['Owner'], keywords: ['retention', 'csv', 'excel', 'upload', 'purge', 'cache', 'import'] },
      { id: 'go-live', label: 'Go-Live Certification', icon: CheckSquare, roles: ['Owner'], keywords: ['launch', 'checklist', 'ready', 'production'] },
      { id: 'audit', label: 'Audit Log', icon: History, roles: ['Owner'], keywords: ['history', 'timeline', 'changes', 'actors', 'logs'] },
      { id: 'system-health', label: 'System Health', icon: Activity, roles: ['Owner'], keywords: ['diagnostics', 'database', 'connection', 'status', 'ping'] },
      { id: 'feature-flags', label: 'Feature Flags', icon: Flag, roles: ['Owner'], keywords: ['beta', 'experimental', 'testing', 'rollout'] },
    ],
  },
];

interface SettingsNavigationProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  userRole: string | null;
  searchQuery?: string;
}

export function SettingsNavigation({
  activeTab,
  onTabChange,
  userRole = 'Stylist',
  searchQuery = '',
}: SettingsNavigationProps) {
  const role = userRole || 'Stylist';

  return (
    <nav className="space-y-6">
      {SETTINGS_GROUPS.map((group) => {
        // Filter items by role permission and search query
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
          <div key={group.group} className="space-y-1.5">
            <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {group.group}
            </h4>
            <div className="space-y-0.5">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      active
                        ? 'bg-brand-soft text-brand-primary ring-1 ring-inset ring-focus-ring'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-brand-primary' : 'text-stone-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
