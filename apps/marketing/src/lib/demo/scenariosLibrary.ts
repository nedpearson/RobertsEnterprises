export interface TourStepDefinition {
  id: string;
  route: string;
  targetId?: string; 
  mobileTargetId?: string; 
  mobileRoute?: string; 
  requiresMobileDrawer?: boolean; 
  narrationText: string;
  caption: string;
  action: 'explain' | 'move' | 'click' | 'type' | 'select' | 'waitFor' | 'assert';
  value?: string;
  waitForRoute?: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  targetRole: string;
  startRoute: string;
  estimatedMinutes: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  steps: TourStepDefinition[];
}

export const DEMO_SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'scenario-16-chapters',
    name: 'VowOS Executive Presentation',
    description: 'The definitive 16-chapter sales presentation showing the entire customer and operational journey.',
    targetRole: 'Owner',
    startRoute: 'dashboard',
    estimatedMinutes: 15,
    difficulty: 'Beginner',
    steps: [
      { id: 'ch1', route: 'dashboard', narrationText: 'Chapter 1: The Executive Dashboard. Total visibility into your bridal enterprise from day one.', caption: 'Executive Dashboard', action: 'explain' },
      { id: 'ch2', route: 'marketing', narrationText: 'Chapter 2: Marketing & Growth. AI-optimized campaigns driving brides directly to your door.', caption: 'Marketing Engine', action: 'click', targetId: 'nav-marketing', waitForRoute: 'marketing' },
      { id: 'ch3', route: 'leads', narrationText: 'Chapter 3: Lead Management. Never lose track of an inquiry again. Instant attribution and scoring.', caption: 'Lead Pipeline', action: 'click', targetId: 'nav-leads', waitForRoute: 'leads' },
      { id: 'ch4', route: 'messages', narrationText: 'Chapter 4: Unified Communications. SMS, Email, and Instagram DMs flowing into one single inbox.', caption: 'Unified Inbox', action: 'click', targetId: 'nav-messages', waitForRoute: 'messages' },
      { id: 'ch5', route: 'dashboard', narrationText: 'Chapter 5: Premium Online Booking. A gorgeous booking engine integrated directly into your brand.', caption: 'Booking Engine', action: 'explain' },
      { id: 'ch6', route: 'calendar', narrationText: 'Chapter 6: Intelligent Calendar. Complete sync across all fitting rooms and stylists.', caption: 'Smart Calendar', action: 'click', targetId: 'nav-calendar', waitForRoute: 'calendar' },
      { id: 'ch7', route: 'customers', narrationText: 'Chapter 7: The Customer Profile. Every preference, measurement, and note saved forever.', caption: 'Customer CRM', action: 'click', targetId: 'nav-customers', waitForRoute: 'customers' },
      { id: 'ch8', route: 'gowns', narrationText: 'Chapter 8: Inventory Control. Real-time stock, transfers, and receiving for your most expensive assets.', caption: 'Gown Management', action: 'click', targetId: 'nav-gowns', waitForRoute: 'gowns' },
      { id: 'ch9', route: 'pos', narrationText: 'Chapter 9: Point of Sale. Effortless invoicing, payment plans, and split payments.', caption: 'POS & Invoicing', action: 'click', targetId: 'nav-pos', waitForRoute: 'pos' },
      { id: 'ch10', route: 'orders', narrationText: 'Chapter 10: Purchase Orders. Direct vendor integration so you never miss a shipping date.', caption: 'Vendor Orders', action: 'click', targetId: 'nav-orders', waitForRoute: 'orders' },
      { id: 'ch11', route: 'dashboard', narrationText: 'Chapter 11: Alterations Tracking. Precision timeline management for the perfect fit.', caption: 'Alterations', action: 'explain' },
      { id: 'ch12', route: 'staff', narrationText: 'Chapter 12: Workforce Management. Commissions, scheduling, and staff performance metrics.', caption: 'Staff & Commissions', action: 'click', targetId: 'nav-staff', waitForRoute: 'staff' },
      { id: 'ch13', route: 'finance', narrationText: 'Chapter 13: Financial Reconciliation. Syncing perfectly with QuickBooks and standardizing your books.', caption: 'Financials', action: 'click', targetId: 'nav-finance', waitForRoute: 'finance' },
      { id: 'ch14', route: 'reports', narrationText: 'Chapter 14: Advanced Reporting. Data-driven insights to make $100M decisions.', caption: 'Reporting & Analytics', action: 'click', targetId: 'nav-reports', waitForRoute: 'reports' },
      { id: 'ch15', route: 'settings', narrationText: 'Chapter 15: Security & Compliance. Enterprise-grade roles, privacy, and data protection.', caption: 'Security', action: 'click', targetId: 'nav-settings', waitForRoute: 'settings' },
      { id: 'ch16', route: 'dashboard', narrationText: 'Chapter 16: The Future of Bridal. VowOS scales with your ambition. Welcome to the new standard.', caption: 'Welcome to VowOS', action: 'click', targetId: 'nav-dashboard', waitForRoute: 'dashboard' },
    ]
  }
];

export const getScenarioById = (id: string): ScenarioDefinition | undefined => {
  return DEMO_SCENARIOS.find(s => s.id === id);
};

export const MOBILE_DEMO_SCENARIOS: ScenarioDefinition[] = [DEMO_SCENARIOS[0]];

