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
  | 'business-hours'
  | 'branding'
  | 'regional'
  | 'taxes'
  | 'fiscal'
  | 'modules'
  | 'appointments'
  | 'customers'
  | 'sales'
  | 'inventory'
  | 'team'
  | 'growth'
  | 'reports'
  | 'notifications'
  | 'email'
  | 'sms'
  | 'templates'
  | 'automations'
  | 'integrations'
  | 'integrations-shopify'
  | 'integrations-google'
  | 'integrations-meta'
  | 'integrations-accounting'
  | 'integrations-payments'
  | 'integrations-calendar'
  | 'integrations-website'
  | 'integrations-api'
  | 'ai-settings'
  | 'ai-recommendations'
  | 'automations-rules'
  | 'approval-requirements'
  | 'ai-safety'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'security'
  | 'approval-rules'
  | 'sessions'
  | 'audit'
  | 'imports'
  | 'exports'
  | 'custom-fields'
  | 'data-retention'
  | 'data-management';

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
    group: 'ORGANIZATION',
    items: [
      { id: 'organization', label: 'Organization Profile', icon: Building, roles: ['Owner'], keywords: ['name', 'logo'] },
      { id: 'locations', label: 'Locations', icon: MapPin, roles: ['Owner', 'Manager'], keywords: ['store', 'address'] },
      { id: 'business-hours', label: 'Business Hours', icon: Calendar, roles: ['Owner', 'Manager'], keywords: ['hours', 'time'] },
      { id: 'branding', label: 'Branding', icon: LayoutGrid, roles: ['Owner'], keywords: ['colors', 'brand'] },
      { id: 'regional', label: 'Regional Settings', icon: Globe, roles: ['Owner'], keywords: ['timezone', 'currency'] },
      { id: 'taxes', label: 'Taxes', icon: Percent, roles: ['Owner', 'Manager'], keywords: ['tax', 'rates'] },
      { id: 'fiscal', label: 'Fiscal Settings', icon: Receipt, roles: ['Owner'], keywords: ['fiscal', 'accounting'] },
    ],
  },
  {
    group: 'FEATURES & WORKFLOWS',
    items: [
      { id: 'modules', label: 'Features & Modules', icon: LayoutGrid, roles: ['Owner'], keywords: ['modules', 'features', 'toggles'] },
      { id: 'appointments', label: 'Appointments', icon: CalendarDays, roles: ['Owner', 'Manager'], keywords: ['appointments', 'booking'] },
      { id: 'customers', label: 'Customers', icon: Users, roles: ['Owner', 'Manager'], keywords: ['customers', 'crm'] },
      { id: 'sales', label: 'Sales', icon: Receipt, roles: ['Owner', 'Manager'], keywords: ['sales', 'checkout'] },
      { id: 'inventory', label: 'Inventory & Purchasing', icon: Shirt, roles: ['Owner', 'Manager'], keywords: ['inventory', 'po'] },
      { id: 'team', label: 'Team', icon: Users, roles: ['Owner', 'Manager'], keywords: ['team', 'staff'] },
      { id: 'growth', label: 'Growth', icon: Sparkles, roles: ['Owner'], keywords: ['growth', 'marketing'] },
      { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['Owner', 'Manager'], keywords: ['reports', 'analytics'] },
    ],
  },
  {
    group: 'COMMUNICATIONS',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['Owner', 'Manager'], keywords: ['alerts', 'push'] },
      { id: 'email', label: 'Email', icon: MessageSquare, roles: ['Owner', 'Manager'], keywords: ['email', 'inbox'] },
      { id: 'sms', label: 'SMS', icon: MessageSquare, roles: ['Owner', 'Manager'], keywords: ['sms', 'text'] },
      { id: 'templates', label: 'Templates', icon: FileText, roles: ['Owner', 'Manager'], keywords: ['templates', 'documents'] },
      { id: 'automations', label: 'Automation Rules', icon: Zap, roles: ['Owner', 'Manager'], keywords: ['auto', 'rules'] },
    ],
  },
  {
    group: 'INTEGRATIONS',
    items: [
      { id: 'integrations', label: 'Overview', icon: Plug, roles: ['Owner'], keywords: ['integrations'] },
      { id: 'integrations-shopify', label: 'Shopify', icon: Plug, roles: ['Owner'], keywords: ['shopify'] },
      { id: 'integrations-google', label: 'Google', icon: Plug, roles: ['Owner'], keywords: ['google'] },
      { id: 'integrations-meta', label: 'Meta / Social', icon: Plug, roles: ['Owner'], keywords: ['facebook', 'instagram'] },
      { id: 'integrations-accounting', label: 'Accounting', icon: Plug, roles: ['Owner'], keywords: ['quickbooks', 'xero'] },
      { id: 'integrations-payments', label: 'Payments', icon: CreditCard, roles: ['Owner'], keywords: ['stripe'] },
    ],
  },
  {
    group: 'PEOPLE & SECURITY',
    items: [
      { id: 'users', label: 'Users', icon: Users, roles: ['Owner'], keywords: ['users', 'staff'] },
      { id: 'roles', label: 'Roles', icon: ShieldAlert, roles: ['Owner'], keywords: ['roles'] },
      { id: 'permissions', label: 'Permissions', icon: ShieldAlert, roles: ['Owner'], keywords: ['permissions'] },
      { id: 'security', label: 'Security', icon: ShieldAlert, roles: ['Owner'], keywords: ['security', 'password'] },
      { id: 'audit', label: 'Audit History', icon: History, roles: ['Owner'], keywords: ['audit', 'logs'] },
    ],
  },
  {
    group: 'DATA',
    items: [
      { id: 'imports', label: 'Imports', icon: Database, roles: ['Owner'], keywords: ['import'] },
      { id: 'exports', label: 'Exports', icon: Database, roles: ['Owner'], keywords: ['export'] },
      { id: 'data-management', label: 'Data Management', icon: Database, roles: ['Owner'], keywords: ['data', 'purge'] },
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
