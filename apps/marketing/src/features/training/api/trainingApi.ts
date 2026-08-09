import { TrainingCourse, TrainingProgress, StepStatus, TrainingCertification } from '../types/trainingTypes';

const TRAINING_PROGRESS_STORAGE_KEY = 'vowos_training_progress_v1';
const CERTS_STORAGE_KEY = 'vowos_training_certs_v1';

export const OWNER_ONBOARDING_COURSE: TrainingCourse = {
  id: 'course-owner-onboarding',
  code: 'OWN-101',
  title: 'VowOS Master Owner Onboarding & Go-Live Academy',
  description: 'Complete 23-phase interactive setup, configuration, verification, and go-live training for business owners.',
  category: 'onboarding',
  audienceRoles: ['owner'],
  version: '2026.2',
  required: true,
  estimatedMinutes: 130,
  lessons: [
    {
      id: 'les-phase-01',
      courseId: 'course-owner-onboarding',
      sequence: 1,
      title: 'Phase 1 — Business Foundation & Locations',
      description: 'Configure legal entity, brands, contact info, operating hours, policies, and boutique locations.',
      estimatedMinutes: 5,
      required: true,
      category: 'Foundation',
      steps: [
        {
          id: 'step-p1-1',
          courseId: 'course-owner-onboarding',
          lessonId: 'les-phase-01',
          sequence: 1,
          title: 'Review Legal Business & Brand Names',
          narration: 'Welcome to VowOS! First, let us verify The Boutique, Proper & Co., and I Do Bridal Couture business identity.',
          transcript: 'Welcome to VowOS! First, let us verify The Boutique, Proper & Co., and I Do Bridal Couture business identity.',
          route: '/settings',
          targetSelector: '[data-training-id="settings-business-section"]',
          action: 'observe',
          required: true,
        },
        {
          id: 'step-p1-2',
          courseId: 'course-owner-onboarding',
          lessonId: 'les-phase-01',
          sequence: 2,
          title: 'Verify Boutique Locations',
          narration: 'Confirm the active store locations for Baton Rouge and Covington boutiques.',
          transcript: 'Confirm the active store locations for Baton Rouge and Covington boutiques.',
          route: '/settings',
          targetSelector: '[data-training-id="settings-locations-section"]',
          action: 'click',
          required: true,
        },
      ],
    },
    {
      id: 'les-phase-02',
      courseId: 'course-owner-onboarding',
      sequence: 2,
      title: 'Phase 2 — Users, Roles & Security',
      description: 'Set up employee permissions, role access, and multi-factor authentication policies.',
      estimatedMinutes: 6,
      required: true,
      category: 'Security',
      steps: [
        {
          id: 'step-p2-1',
          courseId: 'course-owner-onboarding',
          lessonId: 'les-phase-02',
          sequence: 1,
          title: 'Review Roles & Permissions',
          narration: 'VowOS enforces strict role-based access control. Owners have full visibility, while consultants and inventory staff are scoped.',
          transcript: 'VowOS enforces strict role-based access control. Owners have full visibility, while consultants and inventory staff are scoped.',
          route: '/settings',
          targetSelector: '[data-training-id="settings-users-section"]',
          action: 'observe',
          required: true,
        },
      ],
    },
    {
      id: 'les-phase-04',
      courseId: 'course-owner-onboarding',
      sequence: 4,
      title: 'Phase 4 — Action Center & Operations',
      description: 'Master the Action Center to handle urgent exceptions, owner approvals, and AI-prioritized task resolution across all locations.',
      estimatedMinutes: 10,
      required: true,
      category: 'Operations',
      steps: [
        {
          id: 'step-p4-1',
          courseId: 'course-owner-onboarding',
          lessonId: 'les-phase-04',
          sequence: 1,
          title: 'Difference between Calendar and Action Center',
          narration: 'Calendar & Scheduling manages time, staffing, and appointments. The Action Center shows exceptions, approvals, and follow-ups requiring attention across the business.',
          transcript: 'Calendar & Scheduling manages time, staffing, and appointments. The Action Center shows exceptions, approvals, and follow-ups requiring attention across the business.',
          route: '/actions',
          targetSelector: '[data-training-id="tab-actions"]',
          action: 'observe',
          required: true,
        }
      ]
    },
    {
      id: 'les-phase-03',
      courseId: 'course-owner-onboarding',
      sequence: 3,
      title: 'Phase 3 — Shopify Permanent Connection',
      description: 'Connect Proper & Co. Shopify store, map inventory locations, and verify store scopes.',
      estimatedMinutes: 8,
      required: true,
      category: 'Ecommerce',
      steps: [
        {
          id: 'step-p3-1',
          courseId: 'course-owner-onboarding',
          lessonId: 'les-phase-03',
          sequence: 1,
          title: 'Inspect Shopify Connection Health',
          narration: 'Let us inspect the Shopify Connection in Growth & Marketing Connections Center.',
          transcript: 'Let us inspect the Shopify Connection in Growth & Marketing Connections Center.',
          route: '/growth/connections',
          targetSelector: '[data-training-id="provider-card-shopify"]',
          action: 'observe',
          required: true,
        },
        {
          id: 'step-p3-2',
          courseId: 'course-owner-onboarding',
          lessonId: 'les-phase-03',
          sequence: 2,
          title: 'Run Shopify Read-Only Test',
          narration: 'Now click Test Connection to verify shop identity, product access, and webhook health.',
          transcript: 'Now click Test Connection to verify shop identity, product access, and webhook health.',
          route: '/growth/connections',
          targetSelector: '[data-training-id="btn-test-shopify"]',
          action: 'click',
          required: true,
        },
      ],
    },
    {
      id: 'les-phase-04',
      courseId: 'course-owner-onboarding',
      sequence: 4,
      title: 'Phase 4 — Catalog & Vendor Price Lists',
      description: 'Import bridal and boutique vendor catalogs, map style numbers, and review gross margins.',
      estimatedMinutes: 7,
      required: true,
      category: 'Catalog',
      steps: [
        {
          id: 'step-p4-1',
          courseId: 'course-owner-onboarding',
          lessonId: 'les-phase-04',
          sequence: 1,
          title: 'Navigate to Inventory & Product Catalog',
          narration: 'Let us review vendor price lists and wholesale costs in the Inventory module.',
          transcript: 'Let us review vendor price lists and wholesale costs in the Inventory module.',
          route: '/inventory',
          targetSelector: '[data-training-id="nav-inventory"]',
          action: 'click',
          required: true,
        },
      ],
    },
    {
      id: 'les-phase-06',
      courseId: 'course-owner-onboarding',
      sequence: 6,
      title: 'Phase 6 — Tax Setup & Accountant Acknowledgment',
      description: 'Review store nexus tax boundaries and confirm legal accountant acknowledgment.',
      estimatedMinutes: 5,
      required: true,
      category: 'Finance',
      steps: [
        {
          id: 'step-p6-1',
          courseId: 'course-owner-onboarding',
          lessonId: 'les-phase-06',
          sequence: 1,
          title: 'Tax Boundary & Acknowledgment',
          narration: 'VowOS never invents tax rates. You must confirm that tax settings have been reviewed with your authorized accountant.',
          transcript: 'VowOS never invents tax rates. You must confirm that tax settings have been reviewed with your authorized accountant.',
          route: '/settings',
          targetSelector: '[data-training-id="settings-tax-section"]',
          action: 'observe',
          required: true,
        },
      ],
    },
    {
      id: 'les-phase-10',
      courseId: 'course-owner-onboarding',
      sequence: 10,
      title: 'Phase 10 — Google Ads & GA4 Integration',
      description: 'Independently verify Google Ads Customer ID (481-902-1189) and GA4 Property (3091829).',
      estimatedMinutes: 8,
      required: true,
      category: 'Marketing',
      steps: [
        {
          id: 'step-p10-1',
          courseId: 'course-owner-onboarding',
          lessonId: 'les-phase-10',
          sequence: 1,
          title: 'Inspect Google Integration Card',
          narration: 'Google Ads and Google Analytics 4 are evaluated as separate sub-services within the Google Integration card.',
          transcript: 'Google Ads and Google Analytics 4 are evaluated as separate sub-services within the Google Integration card.',
          route: '/growth/connections',
          targetSelector: '[data-training-id="provider-card-google"]',
          action: 'observe',
          required: true,
        },
      ],
    },
    {
      id: 'les-phase-11',
      courseId: 'course-owner-onboarding',
      sequence: 11,
      title: 'Phase 11 — Meta & Instagram Business Account',
      description: 'Verify Meta Business ID, Instagram Professional Account, Ad Account, and lead forms.',
      estimatedMinutes: 8,
      required: true,
      category: 'Marketing',
      steps: [
        {
          id: 'step-p11-1',
          courseId: 'course-owner-onboarding',
          lessonId: 'les-phase-11',
          sequence: 1,
          title: 'Inspect Meta Business Account',
          narration: 'Meta Business Manager requires an active Ad Account selection and lead retrieval scope.',
          transcript: 'Meta Business Manager requires an active Ad Account selection and lead retrieval scope.',
          route: '/growth/connections',
          targetSelector: '[data-training-id="provider-card-meta"]',
          action: 'observe',
          required: true,
        },
      ],
    },
    {
      id: 'les-phase-18',
      courseId: 'course-owner-onboarding',
      sequence: 18,
      title: 'Phase 18 — Marketing Budgets & Emergency Pause',
      description: 'Configure monthly budget caps, hard stops, and test the Emergency Campaign Pause.',
      estimatedMinutes: 6,
      required: true,
      category: 'Budgets',
      steps: [
        {
          id: 'step-p18-1',
          courseId: 'course-owner-onboarding',
          lessonId: 'les-phase-18',
          sequence: 1,
          title: 'Open Campaign Budget Control',
          narration: 'Let us inspect monthly campaign budget limits and financial safety caps in Growth & Marketing.',
          transcript: 'Let us inspect monthly campaign budget limits and financial safety caps in Growth & Marketing.',
          route: '/growth/budgets',
          targetSelector: '[data-training-id="nav-budgets"]',
          action: 'click',
          required: true,
        },
      ],
    },
    {
      id: 'les-phase-23',
      courseId: 'course-owner-onboarding',
      sequence: 23,
      title: 'Phase 23 — Final Go-Live Verification & Review',
      description: 'Run the 34-point automated readiness engine to verify system health before launching production.',
      estimatedMinutes: 10,
      required: true,
      category: 'Go-Live',
      steps: [
        {
          id: 'step-p23-1',
          courseId: 'course-owner-onboarding',
          lessonId: 'les-phase-23',
          sequence: 1,
          title: 'Run Automated Go-Live Readiness Audit',
          narration: 'Let us review the automated Go-Live Readiness report to ensure all blocking criteria are green.',
          transcript: 'Let us review the automated Go-Live Readiness report to ensure all blocking criteria are green.',
          route: '/training',
          targetSelector: '[data-training-id="tab-onboarding-dashboard"]',
          action: 'click',
          required: true,
        },
      ],
    },
  ],
};

export const ROLE_COURSES: TrainingCourse[] = [
  OWNER_ONBOARDING_COURSE,
  {
    id: 'course-manager-ops',
    code: 'MGR-201',
    title: 'Boutique Store Manager Operational Masterclass',
    description: 'Lead management, consultant scheduling, SLA escalation, inventory transfers, and daily boutique reporting.',
    category: 'manager',
    audienceRoles: ['manager'],
    version: '2026.2',
    required: true,
    estimatedMinutes: 45,
    lessons: [],
  },
  {
    id: 'course-consultant-sales',
    code: 'CON-101',
    title: 'Bridal Consultant & Stylist Sales Academy',
    description: 'Managing My Leads, bride consultation records, appointment prep, dress selections, contracts, and follow-ups.',
    category: 'customer',
    audienceRoles: ['consultant'],
    version: '2026.2',
    required: true,
    estimatedMinutes: 30,
    lessons: [],
  },
  {
    id: 'course-inventory-ops',
    code: 'INV-101',
    title: 'Inventory, Receiving & Transfer Operations',
    description: 'Barcode scanning, purchase order receiving, store transfers between Baton Rouge and Covington, and sample tracking.',
    category: 'inventory',
    audienceRoles: ['inventory'],
    version: '2026.2',
    required: true,
    estimatedMinutes: 35,
    lessons: [],
  },
  {
    id: 'course-marketing-growth',
    code: 'MKT-101',
    title: 'Growth & Marketing Campaign Management',
    description: 'Managing ad spend, campaign creation, creative assets, CallRail call tracking, UTM attribution, and AI Copilot.',
    category: 'marketing',
    audienceRoles: ['marketing'],
    version: '2026.2',
    required: true,
    estimatedMinutes: 40,
    lessons: [],
  },
];

export function getTrainingCourses(): TrainingCourse[] {
  return ROLE_COURSES;
}

export function getCourseById(courseId: string): TrainingCourse | undefined {
  return ROLE_COURSES.find((c) => c.id === courseId);
}

export function getTrainingProgressList(): TrainingProgress[] {
  try {
    const raw = localStorage.getItem(TRAINING_PROGRESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTrainingProgress(progress: TrainingProgress) {
  const list = getTrainingProgressList();
  const filtered = list.filter((p) => !(p.userId === progress.userId && p.stepId === progress.stepId));
  filtered.push(progress);
  localStorage.setItem(TRAINING_PROGRESS_STORAGE_KEY, JSON.stringify(filtered));
}

export function getCertifications(): TrainingCertification[] {
  try {
    const raw = localStorage.getItem(CERTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  return [
    {
      id: 'cert-001',
      userId: 'user-ramsey-roberts',
      userName: 'Ramsey Roberts',
      userRole: 'owner',
      certificationType: 'VowOS Certified Enterprise Owner & Master Administrator',
      courseVersion: '2026.2',
      issuedAt: '2026-07-20T10:00:00Z',
      expiresAt: '2027-07-20T10:00:00Z',
      status: 'active',
    },
  ];
}
