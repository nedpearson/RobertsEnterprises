export type FeatureKey =
  | 'appointments'
  | 'appointments.online_booking'
  | 'appointments.confirmations'
  | 'appointments.reminders'
  | 'appointments.deposits'
  | 'appointments.waitlist'
  | 'appointments.check_in'
  | 'appointments.rooms'
  | 'appointments.ai_assignment'
  | 'customers'
  | 'customers.crm'
  | 'customers.preferences'
  | 'customers.tasks'
  | 'customers.follow_up'
  | 'customers.segmentation'
  | 'customers.lifetime_value'
  | 'customers.ai_insights'
  | 'sales'
  | 'sales.quotes'
  | 'sales.orders'
  | 'sales.invoices'
  | 'sales.payments'
  | 'sales.refunds'
  | 'sales.financing'
  | 'sales.discounts'
  | 'sales.commissions'
  | 'inventory'
  | 'inventory.catalog'
  | 'inventory.designers'
  | 'inventory.vendors'
  | 'inventory.purchase_orders'
  | 'inventory.receiving'
  | 'inventory.transfers'
  | 'inventory.counts'
  | 'inventory.adjustments'
  | 'inventory.smart_po'
  | 'inventory.ai_rebalancer'
  | 'inventory.otb_forecast'
  | 'team'
  | 'team.employees'
  | 'team.scheduling'
  | 'team.availability'
  | 'team.timeclock'
  | 'team.timesheets'
  | 'team.pto'
  | 'team.payroll'
  | 'team.commissions'
  | 'team.performance'
  | 'team.training'
  | 'growth'
  | 'growth.leads'
  | 'growth.campaigns'
  | 'growth.google'
  | 'growth.meta'
  | 'growth.instagram'
  | 'growth.facebook'
  | 'growth.email'
  | 'growth.sms'
  | 'growth.website'
  | 'growth.attribution'
  | 'growth.roas'
  | 'growth.cost_per_lead'
  | 'growth.referrals'
  | 'growth.ai_advisor'
  | 'growth.competitor_intelligence'
  | 'reports'
  | 'reports.executive'
  | 'reports.sales'
  | 'reports.customers'
  | 'reports.appointments'
  | 'reports.inventory'
  | 'reports.team'
  | 'reports.marketing'
  | 'reports.financial'
  | 'reports.multi_location'
  | 'reports.custom_builder'
  | 'reports.ai_insights'
  | 'reports.scheduled'
  | 'integrations'
  | 'integrations.shopify'
  | 'integrations.google'
  | 'integrations.meta'
  | 'integrations.accounting'
  | 'integrations.payments'
  | 'integrations.calendar'
  | 'integrations.email'
  | 'integrations.sms'
  | 'integrations.website'
  | 'integrations.api';

export interface FeatureCatalogEntry {
  id: string;
  feature_key: FeatureKey;
  display_name: string;
  description: string;
  module: string;
  category: string;
  parent_feature_key?: FeatureKey;
  dependencies?: FeatureKey[];
  minimum_plan: 'essentials' | 'growth' | 'pro' | 'enterprise';
  default_enabled: boolean;
  customer_configurable: boolean;
  platform_only: boolean;
  required: boolean;
  beta: boolean;
  usage_limit_type?: 'users' | 'locations' | 'api_calls' | 'none';
  sort_order: number;
}

export const MASTER_FEATURE_CATALOG: Record<FeatureKey, FeatureCatalogEntry> = {
  // --- APPOINTMENTS ---
  'appointments': {
    id: 'f_appts_core',
    feature_key: 'appointments',
    display_name: 'Appointments',
    description: 'Core scheduling and appointment management.',
    module: 'appointments',
    category: 'Core',
    minimum_plan: 'essentials',
    default_enabled: true,
    customer_configurable: true,
    platform_only: false,
    required: true,
    beta: false,
    sort_order: 10
  },
  'appointments.online_booking': {
    id: 'f_appts_ob', feature_key: 'appointments.online_booking', display_name: 'Online Booking', description: 'Allow customers to book online.', module: 'appointments', category: 'Scheduling', parent_feature_key: 'appointments', minimum_plan: 'growth', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 20
  },
  'appointments.confirmations': { id: 'f_appts_conf', feature_key: 'appointments.confirmations', display_name: 'Confirmations', description: 'Auto-confirmations.', module: 'appointments', category: 'Scheduling', parent_feature_key: 'appointments', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 30 },
  'appointments.reminders': { id: 'f_appts_rem', feature_key: 'appointments.reminders', display_name: 'Reminders', description: 'Auto-reminders.', module: 'appointments', category: 'Scheduling', parent_feature_key: 'appointments', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 40 },
  'appointments.deposits': { id: 'f_appts_dep', feature_key: 'appointments.deposits', display_name: 'Deposits', description: 'Require deposits for booking.', module: 'appointments', category: 'Payments', parent_feature_key: 'appointments', minimum_plan: 'growth', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 50 },
  'appointments.waitlist': { id: 'f_appts_wl', feature_key: 'appointments.waitlist', display_name: 'Waitlist', description: 'Manage waitlists.', module: 'appointments', category: 'Scheduling', parent_feature_key: 'appointments', minimum_plan: 'growth', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 60 },
  'appointments.check_in': { id: 'f_appts_chk', feature_key: 'appointments.check_in', display_name: 'Check In', description: 'Reception check-in flow.', module: 'appointments', category: 'Operations', parent_feature_key: 'appointments', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 70 },
  'appointments.rooms': { id: 'f_appts_rm', feature_key: 'appointments.rooms', display_name: 'Rooms & Resources', description: 'Assign fitting rooms.', module: 'appointments', category: 'Operations', parent_feature_key: 'appointments', minimum_plan: 'growth', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 80 },
  'appointments.ai_assignment': { id: 'f_appts_ai', feature_key: 'appointments.ai_assignment', display_name: 'AI Staff Assignment', description: 'Auto-assign best stylist.', module: 'appointments', category: 'AI', parent_feature_key: 'appointments', minimum_plan: 'enterprise', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: true, sort_order: 90 },

  // --- CUSTOMERS ---
  'customers': { id: 'f_cust_core', feature_key: 'customers', display_name: 'Customers', description: 'Core customer relationship management.', module: 'customers', category: 'Core', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: true, beta: false, sort_order: 100 },
  'customers.crm': { id: 'f_cust_crm', feature_key: 'customers.crm', display_name: 'CRM Profiles', description: 'Detailed profiles.', module: 'customers', category: 'Data', parent_feature_key: 'customers', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: true, beta: false, sort_order: 110 },
  'customers.preferences': { id: 'f_cust_pref', feature_key: 'customers.preferences', display_name: 'Preferences & Sizes', description: 'Track styles and sizes.', module: 'customers', category: 'Data', parent_feature_key: 'customers', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 120 },
  'customers.tasks': { id: 'f_cust_tsk', feature_key: 'customers.tasks', display_name: 'Tasks', description: 'Customer-specific tasks.', module: 'customers', category: 'Workflow', parent_feature_key: 'customers', minimum_plan: 'growth', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 130 },
  'customers.follow_up': { id: 'f_cust_fup', feature_key: 'customers.follow_up', display_name: 'Follow-ups', description: 'Automated follow-up reminders.', module: 'customers', category: 'Workflow', parent_feature_key: 'customers', minimum_plan: 'growth', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 140 },
  'customers.segmentation': { id: 'f_cust_seg', feature_key: 'customers.segmentation', display_name: 'Segmentation', description: 'Advanced audience segments.', module: 'customers', category: 'Analytics', parent_feature_key: 'customers', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 150 },
  'customers.lifetime_value': { id: 'f_cust_ltv', feature_key: 'customers.lifetime_value', display_name: 'Lifetime Value (LTV)', description: 'Track total spend.', module: 'customers', category: 'Analytics', parent_feature_key: 'customers', minimum_plan: 'pro', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 160 },
  'customers.ai_insights': { id: 'f_cust_ai', feature_key: 'customers.ai_insights', display_name: 'AI Insights', description: 'AI purchasing predictions.', module: 'customers', category: 'AI', parent_feature_key: 'customers', minimum_plan: 'enterprise', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: true, sort_order: 170 },

  // --- SALES ---
  'sales': { id: 'f_sale_core', feature_key: 'sales', display_name: 'Sales', description: 'Core sales and transaction management.', module: 'sales', category: 'Core', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: true, beta: false, sort_order: 200 },
  'sales.quotes': { id: 'f_sale_quo', feature_key: 'sales.quotes', display_name: 'Quotes', description: 'Provide quotes/estimates.', module: 'sales', category: 'Transactions', parent_feature_key: 'sales', minimum_plan: 'growth', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 210 },
  'sales.orders': { id: 'f_sale_ord', feature_key: 'sales.orders', display_name: 'Orders', description: 'Track active orders.', module: 'sales', category: 'Transactions', parent_feature_key: 'sales', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: true, beta: false, sort_order: 220 },
  'sales.invoices': { id: 'f_sale_inv', feature_key: 'sales.invoices', display_name: 'Invoices', description: 'Generate invoices.', module: 'sales', category: 'Billing', parent_feature_key: 'sales', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 230 },
  'sales.payments': { id: 'f_sale_pay', feature_key: 'sales.payments', display_name: 'Payments', description: 'Process payments/deposits.', module: 'sales', category: 'Billing', parent_feature_key: 'sales', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: true, beta: false, sort_order: 240 },
  'sales.refunds': { id: 'f_sale_ref', feature_key: 'sales.refunds', display_name: 'Refunds', description: 'Process refunds/credits.', module: 'sales', category: 'Billing', parent_feature_key: 'sales', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 250 },
  'sales.financing': { id: 'f_sale_fin', feature_key: 'sales.financing', display_name: 'Financing', description: 'Offer payment plans.', module: 'sales', category: 'Billing', parent_feature_key: 'sales', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 260 },
  'sales.discounts': { id: 'f_sale_dsc', feature_key: 'sales.discounts', display_name: 'Discounts', description: 'Manage promotions.', module: 'sales', category: 'Pricing', parent_feature_key: 'sales', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 270 },
  'sales.commissions': { id: 'f_sale_com', feature_key: 'sales.commissions', display_name: 'Sales Commissions', description: 'Track staff sales commissions.', module: 'sales', category: 'Operations', parent_feature_key: 'sales', dependencies: ['team.commissions'], minimum_plan: 'growth', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 280 },

  // --- INVENTORY ---
  'inventory': { id: 'f_inv_core', feature_key: 'inventory', display_name: 'Inventory', description: 'Core inventory management.', module: 'inventory', category: 'Core', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: true, beta: false, sort_order: 300 },
  'inventory.catalog': { id: 'f_inv_cat', feature_key: 'inventory.catalog', display_name: 'Catalog', description: 'Product catalog (styles).', module: 'inventory', category: 'Core', parent_feature_key: 'inventory', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: true, beta: false, sort_order: 310 },
  'inventory.designers': { id: 'f_inv_des', feature_key: 'inventory.designers', display_name: 'Designers', description: 'Manage designers/brands.', module: 'inventory', category: 'Data', parent_feature_key: 'inventory', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 320 },
  'inventory.vendors': { id: 'f_inv_ven', feature_key: 'inventory.vendors', display_name: 'Vendors', description: 'Manage suppliers.', module: 'inventory', category: 'Purchasing', parent_feature_key: 'inventory', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 330 },
  'inventory.purchase_orders': { id: 'f_inv_po', feature_key: 'inventory.purchase_orders', display_name: 'Purchase Orders', description: 'Draft and submit POs.', module: 'inventory', category: 'Purchasing', parent_feature_key: 'inventory', dependencies: ['inventory.vendors'], minimum_plan: 'growth', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 340 },
  'inventory.receiving': { id: 'f_inv_rcv', feature_key: 'inventory.receiving', display_name: 'Receiving', description: 'Receive shipments against POs.', module: 'inventory', category: 'Purchasing', parent_feature_key: 'inventory', dependencies: ['inventory.purchase_orders'], minimum_plan: 'growth', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 350 },
  'inventory.transfers': { id: 'f_inv_trn', feature_key: 'inventory.transfers', display_name: 'Transfers', description: 'Multi-location transfers.', module: 'inventory', category: 'Stock', parent_feature_key: 'inventory', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 360 },
  'inventory.counts': { id: 'f_inv_cnt', feature_key: 'inventory.counts', display_name: 'Counts', description: 'Physical inventory counts.', module: 'inventory', category: 'Stock', parent_feature_key: 'inventory', minimum_plan: 'growth', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 370 },
  'inventory.adjustments': { id: 'f_inv_adj', feature_key: 'inventory.adjustments', display_name: 'Adjustments', description: 'Auditable stock adjustments.', module: 'inventory', category: 'Stock', parent_feature_key: 'inventory', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: true, beta: false, sort_order: 380 },
  'inventory.smart_po': { id: 'f_inv_spo', feature_key: 'inventory.smart_po', display_name: 'Smart PO Predictor', description: 'AI ordering recommendations.', module: 'inventory', category: 'AI', parent_feature_key: 'inventory', dependencies: ['inventory.purchase_orders'], minimum_plan: 'enterprise', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: true, sort_order: 390 },
  'inventory.ai_rebalancer': { id: 'f_inv_reb', feature_key: 'inventory.ai_rebalancer', display_name: 'AI Rebalancer', description: 'AI transfer recommendations.', module: 'inventory', category: 'AI', parent_feature_key: 'inventory', dependencies: ['inventory.transfers'], minimum_plan: 'enterprise', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: true, sort_order: 400 },
  'inventory.otb_forecast': { id: 'f_inv_otb', feature_key: 'inventory.otb_forecast', display_name: 'Open-to-Buy Forecast', description: 'Financial purchasing model.', module: 'inventory', category: 'Analytics', parent_feature_key: 'inventory', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 410 },

  // --- TEAM ---
  'team': { id: 'f_tea_core', feature_key: 'team', display_name: 'Team', description: 'Core team management.', module: 'team', category: 'Core', minimum_plan: 'growth', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 500 },
  'team.employees': { id: 'f_tea_emp', feature_key: 'team.employees', display_name: 'Employees', description: 'Staff directory and profiles.', module: 'team', category: 'Core', parent_feature_key: 'team', minimum_plan: 'growth', default_enabled: true, customer_configurable: true, platform_only: false, required: true, beta: false, sort_order: 510 },
  'team.scheduling': { id: 'f_tea_sch', feature_key: 'team.scheduling', display_name: 'Scheduling', description: 'Staff shift scheduling.', module: 'team', category: 'Operations', parent_feature_key: 'team', minimum_plan: 'growth', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 520 },
  'team.availability': { id: 'f_tea_avl', feature_key: 'team.availability', display_name: 'Availability', description: 'Manage staff availability.', module: 'team', category: 'Operations', parent_feature_key: 'team', minimum_plan: 'growth', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 530 },
  'team.timeclock': { id: 'f_tea_clk', feature_key: 'team.timeclock', display_name: 'Timeclock', description: 'Punch in/out tracking.', module: 'team', category: 'Operations', parent_feature_key: 'team', minimum_plan: 'growth', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 540 },
  'team.timesheets': { id: 'f_tea_sht', feature_key: 'team.timesheets', display_name: 'Timesheets', description: 'Review and approve hours.', module: 'team', category: 'Payroll', parent_feature_key: 'team', dependencies: ['team.timeclock'], minimum_plan: 'growth', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 550 },
  'team.pto': { id: 'f_tea_pto', feature_key: 'team.pto', display_name: 'PTO Management', description: 'Track paid time off.', module: 'team', category: 'Operations', parent_feature_key: 'team', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 560 },
  'team.payroll': { id: 'f_tea_pay', feature_key: 'team.payroll', display_name: 'Payroll Export', description: 'Export timesheets for payroll.', module: 'team', category: 'Payroll', parent_feature_key: 'team', dependencies: ['team.timesheets'], minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 570 },
  'team.commissions': { id: 'f_tea_com', feature_key: 'team.commissions', display_name: 'Commission Tracking', description: 'Calculate staff commission.', module: 'team', category: 'Payroll', parent_feature_key: 'team', minimum_plan: 'growth', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 580 },
  'team.performance': { id: 'f_tea_prf', feature_key: 'team.performance', display_name: 'Performance Reviews', description: 'Staff KPIs and reviews.', module: 'team', category: 'Analytics', parent_feature_key: 'team', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 590 },
  'team.training': { id: 'f_tea_trn', feature_key: 'team.training', display_name: 'Training', description: 'Staff onboarding modules.', module: 'team', category: 'Operations', parent_feature_key: 'team', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 600 },

  // --- GROWTH ---
  'growth': { id: 'f_gro_core', feature_key: 'growth', display_name: 'Growth', description: 'Marketing and customer acquisition.', module: 'growth', category: 'Core', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 700 },
  'growth.leads': { id: 'f_gro_ld', feature_key: 'growth.leads', display_name: 'Leads', description: 'Lead pipeline management.', module: 'growth', category: 'Pipeline', parent_feature_key: 'growth', minimum_plan: 'pro', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 710 },
  'growth.campaigns': { id: 'f_gro_cmp', feature_key: 'growth.campaigns', display_name: 'Campaigns', description: 'Marketing campaign tracking.', module: 'growth', category: 'Marketing', parent_feature_key: 'growth', minimum_plan: 'pro', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 720 },
  'growth.google': { id: 'f_gro_ggl', feature_key: 'growth.google', display_name: 'Google Ads Sync', description: 'Sync Google Ads data.', module: 'growth', category: 'Integrations', parent_feature_key: 'growth', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 730 },
  'growth.meta': { id: 'f_gro_met', feature_key: 'growth.meta', display_name: 'Meta Ads Sync', description: 'Sync Facebook/IG Ads data.', module: 'growth', category: 'Integrations', parent_feature_key: 'growth', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 740 },
  'growth.instagram': { id: 'f_gro_ig', feature_key: 'growth.instagram', display_name: 'Instagram Organic', description: 'Track IG metrics.', module: 'growth', category: 'Social', parent_feature_key: 'growth', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 750 },
  'growth.facebook': { id: 'f_gro_fb', feature_key: 'growth.facebook', display_name: 'Facebook Organic', description: 'Track FB metrics.', module: 'growth', category: 'Social', parent_feature_key: 'growth', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 760 },
  'growth.email': { id: 'f_gro_eml', feature_key: 'growth.email', display_name: 'Email Marketing', description: 'Send mass email campaigns.', module: 'growth', category: 'Marketing', parent_feature_key: 'growth', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 770 },
  'growth.sms': { id: 'f_gro_sms', feature_key: 'growth.sms', display_name: 'SMS Marketing', description: 'Send mass SMS campaigns.', module: 'growth', category: 'Marketing', parent_feature_key: 'growth', minimum_plan: 'enterprise', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 780 },
  'growth.website': { id: 'f_gro_web', feature_key: 'growth.website', display_name: 'Website Analytics', description: 'Track website traffic.', module: 'growth', category: 'Analytics', parent_feature_key: 'growth', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 790 },
  'growth.attribution': { id: 'f_gro_att', feature_key: 'growth.attribution', display_name: 'Attribution', description: 'Source tracking for sales.', module: 'growth', category: 'Analytics', parent_feature_key: 'growth', minimum_plan: 'pro', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 800 },
  'growth.roas': { id: 'f_gro_roa', feature_key: 'growth.roas', display_name: 'ROAS Tracking', description: 'Return on ad spend reporting.', module: 'growth', category: 'Analytics', parent_feature_key: 'growth', minimum_plan: 'enterprise', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 810 },
  'growth.cost_per_lead': { id: 'f_gro_cpl', feature_key: 'growth.cost_per_lead', display_name: 'Cost Per Lead', description: 'CPL tracking.', module: 'growth', category: 'Analytics', parent_feature_key: 'growth', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 820 },
  'growth.referrals': { id: 'f_gro_ref', feature_key: 'growth.referrals', display_name: 'Referrals', description: 'Referral tracking program.', module: 'growth', category: 'Marketing', parent_feature_key: 'growth', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 830 },
  'growth.ai_advisor': { id: 'f_gro_adv', feature_key: 'growth.ai_advisor', display_name: 'AI Growth Advisor', description: 'AI marketing recommendations.', module: 'growth', category: 'AI', parent_feature_key: 'growth', minimum_plan: 'enterprise', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: true, sort_order: 840 },
  'growth.competitor_intelligence': { id: 'f_gro_cmp_int', feature_key: 'growth.competitor_intelligence', display_name: 'Competitor Intelligence', description: 'Track local competitors.', module: 'growth', category: 'Analytics', parent_feature_key: 'growth', minimum_plan: 'enterprise', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 850 },

  // --- REPORTS ---
  'reports': { id: 'f_rpt_core', feature_key: 'reports', display_name: 'Reports', description: 'Core analytics and reporting.', module: 'reports', category: 'Core', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: true, beta: false, sort_order: 900 },
  'reports.executive': { id: 'f_rpt_exe', feature_key: 'reports.executive', display_name: 'Executive Dashboard', description: 'High-level business overview.', module: 'reports', category: 'Dashboards', parent_feature_key: 'reports', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: true, beta: false, sort_order: 910 },
  'reports.sales': { id: 'f_rpt_sal', feature_key: 'reports.sales', display_name: 'Sales Reports', description: 'Detailed sales analytics.', module: 'reports', category: 'Analytics', parent_feature_key: 'reports', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 920 },
  'reports.customers': { id: 'f_rpt_cus', feature_key: 'reports.customers', display_name: 'Customer Reports', description: 'CRM and demographic analytics.', module: 'reports', category: 'Analytics', parent_feature_key: 'reports', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 930 },
  'reports.appointments': { id: 'f_rpt_app', feature_key: 'reports.appointments', display_name: 'Appointment Reports', description: 'Booking and schedule analytics.', module: 'reports', category: 'Analytics', parent_feature_key: 'reports', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 940 },
  'reports.inventory': { id: 'f_rpt_inv', feature_key: 'reports.inventory', display_name: 'Inventory Reports', description: 'Stock level and aging analytics.', module: 'reports', category: 'Analytics', parent_feature_key: 'reports', minimum_plan: 'growth', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 950 },
  'reports.team': { id: 'f_rpt_tea', feature_key: 'reports.team', display_name: 'Team Reports', description: 'Staff performance analytics.', module: 'reports', category: 'Analytics', parent_feature_key: 'reports', minimum_plan: 'growth', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 960 },
  'reports.marketing': { id: 'f_rpt_mkt', feature_key: 'reports.marketing', display_name: 'Marketing Reports', description: 'Campaign and growth analytics.', module: 'reports', category: 'Analytics', parent_feature_key: 'reports', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 970 },
  'reports.financial': { id: 'f_rpt_fin', feature_key: 'reports.financial', display_name: 'Financial Reports', description: 'Ledgers and tax reporting.', module: 'reports', category: 'Analytics', parent_feature_key: 'reports', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 980 },
  'reports.multi_location': { id: 'f_rpt_mul', feature_key: 'reports.multi_location', display_name: 'Multi-Location Reports', description: 'Cross-store analytics.', module: 'reports', category: 'Analytics', parent_feature_key: 'reports', minimum_plan: 'enterprise', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 990 },
  'reports.custom_builder': { id: 'f_rpt_cst', feature_key: 'reports.custom_builder', display_name: 'Custom Report Builder', description: 'Build custom queries.', module: 'reports', category: 'Tools', parent_feature_key: 'reports', minimum_plan: 'enterprise', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 1000 },
  'reports.ai_insights': { id: 'f_rpt_ai', feature_key: 'reports.ai_insights', display_name: 'AI Analytics Insights', description: 'Automated data interpretation.', module: 'reports', category: 'AI', parent_feature_key: 'reports', minimum_plan: 'enterprise', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: true, sort_order: 1010 },
  'reports.scheduled': { id: 'f_rpt_sch', feature_key: 'reports.scheduled', display_name: 'Scheduled Reports', description: 'Auto-email reports.', module: 'reports', category: 'Workflow', parent_feature_key: 'reports', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 1020 },

  // --- INTEGRATIONS ---
  'integrations': { id: 'f_int_core', feature_key: 'integrations', display_name: 'Integrations', description: 'Core external connections.', module: 'integrations', category: 'Core', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: true, beta: false, sort_order: 1100 },
  'integrations.shopify': { id: 'f_int_shp', feature_key: 'integrations.shopify', display_name: 'Shopify', description: 'Sync catalog and orders.', module: 'integrations', category: 'E-commerce', parent_feature_key: 'integrations', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 1110 },
  'integrations.google': { id: 'f_int_ggl', feature_key: 'integrations.google', display_name: 'Google Workspace', description: 'SSO and Calendar sync.', module: 'integrations', category: 'Productivity', parent_feature_key: 'integrations', minimum_plan: 'essentials', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 1120 },
  'integrations.meta': { id: 'f_int_met', feature_key: 'integrations.meta', display_name: 'Meta Platforms', description: 'Facebook/IG integration.', module: 'integrations', category: 'Marketing', parent_feature_key: 'integrations', minimum_plan: 'growth', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 1130 },
  'integrations.accounting': { id: 'f_int_acc', feature_key: 'integrations.accounting', display_name: 'Accounting (QBO/Xero)', description: 'Financial sync.', module: 'integrations', category: 'Finance', parent_feature_key: 'integrations', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 1140 },
  'integrations.payments': { id: 'f_int_pay', feature_key: 'integrations.payments', display_name: 'Payment Gateways', description: 'Stripe/Square processing.', module: 'integrations', category: 'Finance', parent_feature_key: 'integrations', minimum_plan: 'essentials', default_enabled: true, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 1150 },
  'integrations.calendar': { id: 'f_int_cal', feature_key: 'integrations.calendar', display_name: 'Calendar Sync', description: 'External calendar integration.', module: 'integrations', category: 'Productivity', parent_feature_key: 'integrations', minimum_plan: 'growth', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 1160 },
  'integrations.email': { id: 'f_int_eml', feature_key: 'integrations.email', display_name: 'Email Providers', description: 'Mailchimp/Klaviyo sync.', module: 'integrations', category: 'Marketing', parent_feature_key: 'integrations', minimum_plan: 'growth', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 1170 },
  'integrations.sms': { id: 'f_int_sms', feature_key: 'integrations.sms', display_name: 'SMS Providers', description: 'Twilio/MessageBird sync.', module: 'integrations', category: 'Marketing', parent_feature_key: 'integrations', minimum_plan: 'pro', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 1180 },
  'integrations.website': { id: 'f_int_web', feature_key: 'integrations.website', display_name: 'Website Widgets', description: 'Embeddable UI components.', module: 'integrations', category: 'Marketing', parent_feature_key: 'integrations', minimum_plan: 'growth', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 1190 },
  'integrations.api': { id: 'f_int_api', feature_key: 'integrations.api', display_name: 'Developer API', description: 'Access to the VowOS API.', module: 'integrations', category: 'Developer', parent_feature_key: 'integrations', minimum_plan: 'enterprise', default_enabled: false, customer_configurable: true, platform_only: false, required: false, beta: false, sort_order: 1200 },
};

export function getFeature(key: FeatureKey): FeatureCatalogEntry {
  return MASTER_FEATURE_CATALOG[key];
}

export function getAllFeatures(): FeatureCatalogEntry[] {
  return Object.values(MASTER_FEATURE_CATALOG).sort((a, b) => a.sort_order - b.sort_order);
}

export function getFeaturesByModule(module: string): FeatureCatalogEntry[] {
  return getAllFeatures().filter(f => f.module === module);
}
