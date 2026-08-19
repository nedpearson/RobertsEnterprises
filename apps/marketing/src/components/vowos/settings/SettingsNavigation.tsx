import { ReactNode } from 'react';
import {
  Building, LayoutGrid,
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
  Globe,
  Crown,
  CheckSquare,
  Users,
  CalendarDays,
  Sparkles
} from 'lucide-react';

export type SettingsTab =
  | 'organization'
  | 'locations'
  | 'payments'
  | 'sales'
  | 'alterations'
  | 'commission'
  | 'booking'
  | 'scheduling'
  | 'inventory'
  | 'purchasing'
  | 'transfers'
  | 'communications'
  | 'automations'
  | 'notifications'
  | 'documents'
  | 'modules'
  | 'integrations'
  | 'ai-models'
  | 'reporting'
  | 'security'
  | 'data'
  | 'audit'
  | 'system-health'
  | 'feature-flags'
  | 'subscriptions'
  | 'go-live';

export interface SettingsCategory {
  group: string;
  items: {
    id: SettingsTab;
    label: string;
    icon: any;
    roles: string[];
    keywords: string[];
  }[];
}

export const SETTINGS_GROUPS: SettingsCategory[] = [
  {
    group: 'ORGANIZATION',
    items: [
      { id: 'organization', label: 'Organization Profile', icon: Building, roles: ['Owner'], keywords: ['name', 'logo'] },
      { id: 'locations', label: 'Locations & Hours', icon: MapPin, roles: ['Owner', 'Manager'], keywords: ['store', 'address', 'hours'] },
      { id: 'subscriptions', label: 'Subscription & Billing', icon: CreditCard, roles: ['Owner'], keywords: ['billing', 'plan', 'payment'] },
      { id: 'go-live', label: 'Launch Checklist', icon: CheckSquare, roles: ['Owner'], keywords: ['launch', 'setup'] },
    ],
  },
  {
    group: 'SALES & REVENUE',
    items: [
      { id: 'payments', label: 'Payments & Taxes', icon: CreditCard, roles: ['Owner', 'Manager'], keywords: ['payments', 'tax', 'stripe'] },
      { id: 'sales', label: 'Sales & Invoicing', icon: Receipt, roles: ['Owner', 'Manager'], keywords: ['invoices', 'checkout', 'pos'] },
      { id: 'alterations', label: 'Alterations & Pickups', icon: Scissors, roles: ['Owner', 'Manager'], keywords: ['alterations', 'fittings', 'pickup'] },
      { id: 'commission', label: 'Commission Plans', icon: Percent, roles: ['Owner'], keywords: ['commission', 'bonus', 'rates'] },
    ],
  },
  {
    group: 'APPOINTMENTS & BOOKING',
    items: [
      { id: 'booking', label: 'Online Booking', icon: MousePointerClick, roles: ['Owner', 'Manager'], keywords: ['booking', 'widget', 'online'] },
      { id: 'scheduling', label: 'Availability Rules', icon: Calendar, roles: ['Owner', 'Manager'], keywords: ['availability', 'hours', 'schedule'] },
    ],
  },
  {
    group: 'INVENTORY OPERATIONS',
    items: [
      { id: 'inventory', label: 'Inventory Rules', icon: Shirt, roles: ['Owner', 'Manager'], keywords: ['inventory', 'stock', 'sku'] },
      { id: 'purchasing', label: 'Purchasing & Vendor', icon: ShoppingBag, roles: ['Owner', 'Manager'], keywords: ['po', 'purchase', 'vendor'] },
      { id: 'transfers', label: 'Store Transfers', icon: ArrowLeftRight, roles: ['Owner', 'Manager'], keywords: ['transfers', 'move'] },
    ],
  },
  {
    group: 'COMMUNICATIONS',
    items: [
      { id: 'communications', label: 'Channels & Twilio', icon: MessageSquare, roles: ['Owner'], keywords: ['twilio', 'sms', 'email'] },
      { id: 'automations', label: 'Automation Rules', icon: Zap, roles: ['Owner', 'Manager'], keywords: ['auto', 'rules', 'triggers'] },
      { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['Owner', 'Manager'], keywords: ['alerts', 'push', 'notify'] },
      { id: 'documents', label: 'Documents & Templates', icon: FileText, roles: ['Owner', 'Manager'], keywords: ['templates', 'pdf', 'docs'] },
    ],
  },
  {
    group: 'SYSTEM & SECURITY',
    items: [
      { id: 'modules', label: 'Workspace Modules', icon: LayoutGrid, roles: ['Owner'], keywords: ['modules', 'features', 'toggles'] },
      { id: 'integrations', label: 'Integrations', icon: Plug, roles: ['Owner'], keywords: ['integrations', 'api', 'connect'] },
      { id: 'ai-models', label: 'AI & Machine Learning', icon: Sparkles, roles: ['Owner'], keywords: ['ai', 'openai', 'models'] },
      { id: 'reporting', label: 'Reporting Settings', icon: BarChart3, roles: ['Owner'], keywords: ['reports', 'analytics', 'fiscal'] },
      { id: 'security', label: 'Security Policy', icon: ShieldAlert, roles: ['Owner'], keywords: ['security', 'password', 'login'] },
      { id: 'data', label: 'Data & Import', icon: Database, roles: ['Owner'], keywords: ['import', 'export', 'data'] },
      { id: 'audit', label: 'Audit Log', icon: History, roles: ['Owner'], keywords: ['audit', 'logs', 'history'] },
      { id: 'system-health', label: 'System Health', icon: Activity, roles: ['Owner'], keywords: ['health', 'status', 'uptime'] },
      { id: 'feature-flags', label: 'Feature Flags', icon: Flag, roles: ['Owner'], keywords: ['experimental', 'beta', 'flags'] },
    ],
  }
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
