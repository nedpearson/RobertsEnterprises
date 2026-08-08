export type TrainingMode = 'guided' | 'practice' | 'live_setup';

export type UserRole = 
  | 'owner'
  | 'manager'
  | 'consultant'
  | 'inventory'
  | 'marketing'
  | 'finance'
  | 'alterations';

export type StepActionType =
  | 'observe'
  | 'click'
  | 'type'
  | 'select'
  | 'upload'
  | 'connect'
  | 'test'
  | 'verify';

export type StepStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'ACTION_REQUIRED'
  | 'EXTERNAL_APPROVAL_REQUIRED'
  | 'TEST_REQUIRED'
  | 'FAILED'
  | 'COMPLETED'
  | 'OPTIONAL'
  | 'NOT_APPLICABLE';

export type TourSyncState =
  | 'PREPARING'
  | 'WAITING_FOR_ROUTE'
  | 'WAITING_FOR_ELEMENT'
  | 'NARRATING'
  | 'MOVING_CURSOR'
  | 'HIGHLIGHTING'
  | 'EXECUTING_ACTION'
  | 'WAITING_FOR_RESULT'
  | 'VALIDATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED';

export interface TrainingValidation {
  type: 'element_present' | 'api_check' | 'connection_truth' | 'owner_acknowledgment' | 'form_submission';
  key?: string;
  expectedValue?: any;
}

export interface TrainingStep {
  id: string;
  courseId: string;
  lessonId: string;
  sequence: number;
  title: string;
  narration: string;
  transcript: string;
  route: string;
  targetSelector: string;
  fallbackSelector?: string;
  mobileTargetSelector?: string;
  action: StepActionType;
  actionPayload?: any;
  expectedScreenState?: string;
  expectedApiState?: string;
  waitForSelector?: string;
  waitForApi?: string;
  timeoutMs?: number;
  validation?: TrainingValidation;
  allowSkip?: boolean;
  required?: boolean;
}

export interface TrainingLesson {
  id: string;
  courseId: string;
  sequence: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  required: boolean;
  category: string;
  steps: TrainingStep[];
}

export interface TrainingCourse {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 
    | 'onboarding'
    | 'owner'
    | 'manager'
    | 'marketing'
    | 'shopify'
    | 'inventory'
    | 'customer'
    | 'finance'
    | 'reports'
    | 'security';
  audienceRoles: UserRole[];
  brandScope?: string[];
  locationScope?: string[];
  version: string;
  required: boolean;
  estimatedMinutes: number;
  lessons: TrainingLesson[];
}

export interface TrainingProgress {
  userId: string;
  courseId: string;
  lessonId: string;
  stepId: string;
  status: StepStatus;
  attempts: number;
  startedAt: string;
  completedAt?: string;
  lastPosition: number;
  timeSpentSeconds: number;
  lastError?: string;
}

export interface GoLiveChecklistItem {
  id: string;
  category: 'BUSINESS' | 'USERS' | 'SHOPIFY' | 'CATALOG' | 'TAX' | 'SHIPPING' | 'PAYMENTS' | 'WEBSITE' | 'MARKETING_CONNECTIONS' | 'LEADS' | 'BUDGETS' | 'AI' | 'REPORTS';
  title: string;
  description: string;
  required: boolean;
  status: StepStatus;
  evidence?: string;
  lastCheckedAt?: string;
  lastError?: string;
  ownerRoleId: UserRole;
  settingsRoute: string;
  testFunctionKey?: string;
}

export interface GoLiveReadinessReport {
  organizationId: string;
  brand: string;
  status: 'NOT READY' | 'READY WITH WARNINGS' | 'READY FOR PRODUCTION';
  readinessScore: number; // 0-100
  completedCount: number;
  requiredTotal: number;
  blockingCount: number;
  warningCount: number;
  lastCheckedAt: string;
  items: GoLiveChecklistItem[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface TrainingQuiz {
  id: string;
  lessonId: string;
  title: string;
  passingScore: number; // e.g. 80
  questions: QuizQuestion[];
}

export interface TrainingCertification {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  certificationType: string;
  courseVersion: string;
  issuedAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'revoked';
}
