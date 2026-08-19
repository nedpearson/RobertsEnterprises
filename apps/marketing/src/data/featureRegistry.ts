export type FeatureReleaseState = 'DEVELOPMENT' | 'INTERNAL' | 'BETA' | 'PRODUCTION';
export type FeatureCategory = 'DAILY OPERATIONS' | 'CUSTOMERS' | 'APPOINTMENTS' | 'SALES' | 'INVENTORY' | 'PURCHASING' | 'TEAM' | 'GROWTH' | 'REPORTING' | 'CONNECTIONS' | 'AUTOMATION' | 'AI' | 'ADMINISTRATION';
export type FeaturePersona = 'Owner' | 'Manager' | 'Stylist' | 'Front Desk' | 'Inventory' | 'Marketing' | 'Accounting' | 'Seamstress';

export interface Feature {
  id: string;
  name: string;
  oneSentenceValue: string;
  category: FeatureCategory;
  workspace: string;
  releaseState: FeatureReleaseState;
  personas: FeaturePersona[];
  route: string;
}

export const FEATURE_REGISTRY: Feature[] = [
  // Appointments
  { id: 'f_calendar', name: 'Calendar', oneSentenceValue: 'Unified view of all boutique appointments and resources.', category: 'APPOINTMENTS', workspace: 'Appointments', releaseState: 'PRODUCTION', personas: ['Owner', 'Manager', 'Stylist', 'Front Desk'], route: '/demo/appointments/calendar' },
  { id: 'f_online_booking', name: 'Online Booking', oneSentenceValue: 'Let brides book appointments directly from your website.', category: 'APPOINTMENTS', workspace: 'Appointments', releaseState: 'PRODUCTION', personas: ['Owner', 'Manager'], route: '/demo/appointments/online' },
  { id: 'f_appointment_types', name: 'Appointment Types', oneSentenceValue: 'Configure rules, durations, and buffers for different visits.', category: 'APPOINTMENTS', workspace: 'Settings', releaseState: 'PRODUCTION', personas: ['Owner', 'Manager'], route: '/demo/settings/scheduling' },
  { id: 'f_reminders', name: 'Automated Reminders', oneSentenceValue: 'Reduce no-shows with automated SMS and email reminders.', category: 'APPOINTMENTS', workspace: 'Growth', releaseState: 'PRODUCTION', personas: ['Owner', 'Manager'], route: '/demo/growth/automations' },
  
  // Customers
  { id: 'f_customer_360', name: 'Customer 360', oneSentenceValue: 'Complete history of every bride, their timeline, and their purchases.', category: 'CUSTOMERS', workspace: 'Customers', releaseState: 'PRODUCTION', personas: ['Owner', 'Manager', 'Stylist', 'Front Desk'], route: '/demo/customers' },
  { id: 'f_style_profiles', name: 'Style Profiles', oneSentenceValue: 'Track bride preferences, moodboards, and inspiration.', category: 'CUSTOMERS', workspace: 'Customers', releaseState: 'PRODUCTION', personas: ['Stylist', 'Manager'], route: '/demo/customers' },
  { id: 'f_measurements', name: 'Measurements', oneSentenceValue: 'Log and track detailed body measurements over time.', category: 'CUSTOMERS', workspace: 'Customers', releaseState: 'PRODUCTION', personas: ['Stylist', 'Seamstress'], route: '/demo/customers' },
  { id: 'f_customer_portal', name: 'Bride Portal', oneSentenceValue: 'Give brides a secure portal to pay invoices and sign contracts.', category: 'CUSTOMERS', workspace: 'Customers', releaseState: 'PRODUCTION', personas: ['Owner'], route: '/demo/customers' },

  // Sales
  { id: 'f_pos', name: 'Point of Sale (POS)', oneSentenceValue: 'Ring up accessories, special orders, and deposits in seconds.', category: 'SALES', workspace: 'Sales', releaseState: 'PRODUCTION', personas: ['Stylist', 'Manager', 'Front Desk'], route: '/demo/sales' },
  { id: 'f_invoices', name: 'Invoices & Payments', oneSentenceValue: 'Generate professional invoices and accept secure online payments.', category: 'SALES', workspace: 'Sales', releaseState: 'PRODUCTION', personas: ['Owner', 'Manager', 'Accounting'], route: '/demo/sales/invoices' },
  { id: 'f_contracts', name: 'Digital Contracts', oneSentenceValue: 'Send legally binding agreements via email or SMS for e-signature.', category: 'SALES', workspace: 'Sales', releaseState: 'PRODUCTION', personas: ['Owner', 'Manager'], route: '/demo/sales/contracts' },
  { id: 'f_alterations', name: 'Alterations Tracking', oneSentenceValue: 'Manage fittings, seamstress schedules, and alteration fees.', category: 'SALES', workspace: 'Sales', releaseState: 'PRODUCTION', personas: ['Manager', 'Seamstress'], route: '/demo/sales/alterations' },

  // Inventory
  { id: 'f_inventory_management', name: 'Inventory Management', oneSentenceValue: 'Track every gown, accessory, and sample across all locations.', category: 'INVENTORY', workspace: 'Inventory', releaseState: 'PRODUCTION', personas: ['Owner', 'Manager', 'Inventory'], route: '/demo/inventory' },
  { id: 'f_purchase_orders', name: 'Purchase Orders', oneSentenceValue: 'Generate and track orders sent to designers and vendors.', category: 'PURCHASING', workspace: 'Inventory', releaseState: 'PRODUCTION', personas: ['Owner', 'Inventory', 'Manager'], route: '/demo/inventory/purchasing' },
  { id: 'f_transfers', name: 'Location Transfers', oneSentenceValue: 'Move inventory seamlessly between your boutique locations.', category: 'INVENTORY', workspace: 'Inventory', releaseState: 'PRODUCTION', personas: ['Inventory', 'Manager'], route: '/demo/inventory/transfers' },
  { id: 'f_catalogs', name: 'Digital Catalogs', oneSentenceValue: 'Showcase dresses to brides on iPads with live inventory status.', category: 'INVENTORY', workspace: 'Inventory', releaseState: 'PRODUCTION', personas: ['Stylist', 'Manager'], route: '/demo/inventory/catalogs' },

  // Team
  { id: 'f_staff_management', name: 'Staff Management', oneSentenceValue: 'Manage employee profiles, roles, and system access.', category: 'TEAM', workspace: 'Team', releaseState: 'PRODUCTION', personas: ['Owner', 'Manager'], route: '/demo/team' },
  { id: 'f_commissions', name: 'Commissions', oneSentenceValue: 'Automatically calculate complex tiered commissions and bonuses.', category: 'TEAM', workspace: 'Team', releaseState: 'PRODUCTION', personas: ['Owner', 'Accounting'], route: '/demo/team/commissions' },
  { id: 'f_schedules', name: 'Staff Schedules', oneSentenceValue: 'Plan employee shifts and manage stylist availability.', category: 'TEAM', workspace: 'Team', releaseState: 'PRODUCTION', personas: ['Owner', 'Manager'], route: '/demo/team/schedules' },

  // Growth & AI
  { id: 'f_reviews', name: 'Review Requests', oneSentenceValue: 'Automatically ask happy brides for Google reviews after pickup.', category: 'GROWTH', workspace: 'Growth', releaseState: 'PRODUCTION', personas: ['Owner', 'Marketing'], route: '/demo/growth/reviews' },
  { id: 'f_lead_capture', name: 'Lead Capture', oneSentenceValue: 'Capture leads from your website and social media automatically.', category: 'GROWTH', workspace: 'Growth', releaseState: 'PRODUCTION', personas: ['Marketing', 'Manager'], route: '/demo/growth/leads' },
  { id: 'f_ai_dress_match', name: 'AI Dress Match', oneSentenceValue: 'Use AI to recommend gowns based on a brides Pinterest board.', category: 'AI', workspace: 'Growth', releaseState: 'BETA', personas: ['Stylist', 'Manager'], route: '/demo/growth/ai' },
  { id: 'f_shopify', name: 'Shopify Sync', oneSentenceValue: 'Keep your in-store inventory perfectly synced with your Shopify site.', category: 'CONNECTIONS', workspace: 'Settings', releaseState: 'PRODUCTION', personas: ['Owner', 'Inventory'], route: '/demo/settings/integrations' },

  // Reports
  { id: 'f_sales_reports', name: 'Sales Reporting', oneSentenceValue: 'Deep analytics on revenue, conversion rates, and top sellers.', category: 'REPORTING', workspace: 'Reports', releaseState: 'PRODUCTION', personas: ['Owner', 'Manager', 'Accounting'], route: '/demo/reports/sales' },
  { id: 'f_inventory_reports', name: 'Inventory Reporting', oneSentenceValue: 'Identify dead stock and optimize purchasing decisions.', category: 'REPORTING', workspace: 'Reports', releaseState: 'PRODUCTION', personas: ['Owner', 'Inventory'], route: '/demo/reports/inventory' },
];
