import { supabase, getActiveDataPlane } from '@/lib/supabase';
import { LocationId } from '@/data/vowosData';

// ─── Settings Types ───

export interface OrganizationSettings {
  name: string;
  legalName: string;
  website: string;
  supportEmail: string;
  timezone: string;
  fiscalCalendarStart: string; // e.g. "January"
}

export interface BusinessHours {
  open: string;  // e.g. "10:00 AM"
  close: string; // e.g. "05:00 PM"
  closed: boolean;
}

export interface LocationSettings {
  id: LocationId;
  name: string;
  phone: string;
  address: string;
  hours: Record<string, BusinessHours>; // day -> hours
  holidayRules: { date: string; name: string; closed: boolean }[];
  accent: 'rose' | 'violet';
}

export interface BookingSettings {
  enabled: boolean;
  appointmentTypesVisible: string[];
  locationsVisible: LocationId[];
  earliestNoticeHours: number;
  maxDaysAdvance: number;
  sameDayBooking: boolean;
  waitlistEnabled: boolean;
  slotHoldDurationMinutes: number;
  sessionExpirationMinutes: number;
  defaultDurationMinutes: number;
  prepBufferMinutes: number;
  cleanupBufferMinutes: number;
  partySizeMax: number;
  simultaneousApptsMax: number;
  selfSelectionEnabled: boolean;
  autoAssignmentEnabled: boolean;
  preferredEmployeeRequest: boolean;
}

export interface BookingQuestion {
  id: string;
  question: string;
  type: 'select' | 'multiselect' | 'currency' | 'date' | 'number' | 'yesno' | 'text' | 'longtext' | 'checkbox';
  options?: string[];
  required: boolean;
  employeeOnly: boolean;
  customerVisible: boolean;
  displayOrder: number;
  appointmentTypes: string[];
  locationOverrides?: Record<string, boolean>;
}

export interface BookingFeeSettings {
  enabled: boolean;
  amountCents: number;
  organizationDefault: number;
  locationOverrides: Record<LocationId, number>;
  promotionalWaiverEnabled: boolean;
  employeeWaiverAllowed: boolean;
  refundable: boolean;
  creditTowardPurchase: boolean;
  cancelDeadlineHours: number;
  rescheduleDeadlineHours: number;
  noShowTreatment: 'forfeit' | 'partial_refund' | 'full_refund';
}

export interface BookingConfirmationSettings {
  immediateConfirm: boolean;
  sevenDayRequest: boolean;
  followUpHours: number;
  finalReminderHours: number;
  timezoneAware: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  maxReminders: number;
}

export interface PaymentTaxSettings {
  cashEnabled: boolean;
  checkEnabled: boolean;
  cardEnabled: boolean;
  achEnabled: boolean;
  giftCardEnabled: boolean;
  storeCreditEnabled: boolean;
  taxRates: Record<LocationId, number>;
  alterationTaxable: boolean;
  bookingFeeTaxable: boolean;
  shippingTaxable: boolean;
}

export interface SalesSettings {
  quoteNumberPrefix: string;
  invoiceNumberPrefix: string;
  quoteExpirationDays: number;
  defaultTerms: string;
  defaultNotes: string;
  discountLimitPct: number;
  managerApprovalThresholdCents: number;
  invoiceLockOnPost: boolean;
  signatureRequired: boolean;
}

export interface CommissionSettings {
  plans: {
    id: string;
    name: string;
    description: string;
    ratePct: number;
    designerRates: Record<string, number>;
    bonusThresholdCents: number;
    bonusAmountCents: number;
    active: boolean;
  }[];
}

export interface InventorySettings {
  trackingEnabled: boolean;
  preventNegative: boolean;
  lowStockThreshold: number;
  reorderThreshold: number;
  barcodeFormat: string;
  skuGenerationPattern: string;
}

export interface PurchasingSettings {
  vendors: {
    id: string;
    name: string;
    email: string;
    phone: string;
    leadTimeDays: number;
    rushLeadTimeDays: number;
  }[];
}

export interface TransferSettings {
  enabled: boolean;
  approvalRequired: boolean;
  approvalThresholdCents: number;
  minSourceStock: number;
  transitDaysDefault: number;
  trackingRequired: boolean;
  scanRequired: boolean;
}

export interface AlterationSettings {
  services: { id: string; name: string; priceCents: number; durationMinutes: number }[];
  fittingsMax: number;
  dueBufferDays: number;
  rushFeeCents: number;
  readyTemplate: string;
}

export interface TwilioSettings {
  connected: boolean;
  messagingServiceSid: string;
  webhookStatus: 'active' | 'inactive';
}

export interface MessageTemplate {
  id: string;
  name: string;
  subject?: string;
  body: string;
  channel: 'sms' | 'email';
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  delayHours: number;
  templateId: string;
  active: boolean;
}

export interface SecuritySettings {
  minPasswordLength: number;
  requireComplexity: boolean;
  lockoutAttempts: number;
  lockoutDurationMinutes: number;
  sessionDurationMinutes: number;
  mfaRequired: boolean;
  idleTimeoutMinutes: number;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPct: number;
}

export interface AISettings {
  enabled: boolean;
  provider: string;
  model: string;
  temperature: number;
  costLimitCents: number;
  dataRetentionDays: number;
  humanApprovalRequired: boolean;
}

export interface DocumentSettings {
  brandLogoUrl: string;
  primaryFontFamily: string;
}

// ─── Default Configurations ───

export const DEFAULT_ORG_SETTINGS: OrganizationSettings = {
  name: 'The Boutique',
  legalName: 'The Boutique LLC',
  website: 'https://robertsenterprises.com',
  supportEmail: 'support@robertsenterprises.com',
  timezone: 'America/Chicago',
  fiscalCalendarStart: 'January',
};

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const createDefaultHours = (city: string): Record<string, BusinessHours> => {
  const isWeekendClosed = city === 'Covington';
  return DEFAULT_DAYS.reduce((acc, day) => {
    const isClosed = day === 'Sunday' || day === 'Monday' || (isWeekendClosed && day === 'Saturday');
    acc[day] = {
      open: '10:00 AM',
      close: city === 'Covington' ? '04:00 PM' : '05:00 PM',
      closed: isClosed,
    };
    return acc;
  }, {} as Record<string, BusinessHours>);
};

export const DEFAULT_LOCATION_SETTINGS: Record<LocationId, LocationSettings> = {
  'ido-br': {
    id: 'ido-br',
    name: 'I Do Bridal Couture - Baton Rouge',
    phone: '(225) 361-0377',
    address: '4343 Perkins Rd, Baton Rouge, LA 70808',
    hours: createDefaultHours('Baton Rouge'),
    holidayRules: [{ date: '2026-12-25', name: 'Christmas Day', closed: true }],
    accent: 'rose',
  },
  'ido-cov': {
    id: 'ido-cov',
    name: 'I Do Bridal Couture - Covington',
    phone: '(985) 327-5598',
    address: '316 Lee Ln, Covington, LA 70433',
    hours: createDefaultHours('Covington'),
    holidayRules: [{ date: '2026-12-25', name: 'Christmas Day', closed: true }],
    accent: 'rose',
  },
  'pc-br': {
    id: 'pc-br',
    name: 'Proper & Company - Baton Rouge',
    phone: '(225) 361-0377',
    address: 'Perkins Rd, Baton Rouge, LA 70808',
    hours: createDefaultHours('Baton Rouge'),
    holidayRules: [{ date: '2026-12-25', name: 'Christmas Day', closed: true }],
    accent: 'violet',
  },
  'pc-cov': {
    id: 'pc-cov',
    name: 'Proper & Company - Covington',
    phone: '(985) 327-5598',
    address: 'Downtown Covington, LA 70433',
    hours: createDefaultHours('Covington'),
    holidayRules: [{ date: '2026-12-25', name: 'Christmas Day', closed: true }],
    accent: 'violet',
  },
};

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  enabled: true,
  appointmentTypesVisible: ['Bridal Consultation', 'Fitting', 'Alterations', 'Pickup', 'Accessories'],
  locationsVisible: ['ido-br', 'ido-cov', 'pc-br', 'pc-cov'],
  earliestNoticeHours: 24,
  maxDaysAdvance: 90,
  sameDayBooking: false,
  waitlistEnabled: true,
  slotHoldDurationMinutes: 15,
  sessionExpirationMinutes: 30,
  defaultDurationMinutes: 90,
  prepBufferMinutes: 15,
  cleanupBufferMinutes: 15,
  partySizeMax: 6,
  simultaneousApptsMax: 3,
  selfSelectionEnabled: true,
  autoAssignmentEnabled: true,
  preferredEmployeeRequest: true,
};

export const DEFAULT_BOOKING_QUESTIONS: BookingQuestion[] = [
  { id: '1', question: 'What type of dress or service are you looking for?', type: 'select', options: ['Wedding Gown', 'Bridesmaids', 'Mother of the Bride', 'Accessories', 'Not Sure'], required: true, employeeOnly: false, customerVisible: true, displayOrder: 1, appointmentTypes: ['Bridal Consultation'] },
  { id: '2', question: 'Preferred budget', type: 'currency', required: true, employeeOnly: false, customerVisible: true, displayOrder: 2, appointmentTypes: ['Bridal Consultation'] },
  { id: '3', question: 'Wedding or event date', type: 'date', required: true, employeeOnly: false, customerVisible: true, displayOrder: 3, appointmentTypes: ['Bridal Consultation', 'Fitting'] },
  { id: '4', question: "Customer's role in the event", type: 'select', options: ['Bride', 'Bridesmaid', 'Mother', 'Guest', 'Other'], required: true, employeeOnly: false, customerVisible: true, displayOrder: 4, appointmentTypes: ['Bridal Consultation'] },
  { id: '5', question: 'Preferred silhouettes', type: 'multiselect', options: ['A-Line', 'Ballgown', 'Mermaid', 'Sheath', 'Fit & Flare'], required: false, employeeOnly: false, customerVisible: true, displayOrder: 5, appointmentTypes: ['Bridal Consultation'] },
  { id: '6', question: 'Preferred designers', type: 'multiselect', options: ['Monique Lhuillier', 'Berta', 'Pronovias', 'Ines Di Santo'], required: false, employeeOnly: false, customerVisible: true, displayOrder: 6, appointmentTypes: ['Bridal Consultation'] },
  { id: '7', question: 'Size range', type: 'select', options: ['0-4', '6-10', '12-16', '18-22', '24+'], required: false, employeeOnly: false, customerVisible: true, displayOrder: 7, appointmentTypes: ['Bridal Consultation', 'Fitting'] },
  { id: '8', question: 'Number of guests', type: 'number', required: true, employeeOnly: false, customerVisible: true, displayOrder: 8, appointmentTypes: ['Bridal Consultation'] },
  { id: '9', question: 'Purchase timeline', type: 'select', options: ['Shopping today to buy', 'Just starting to look', 'Needs decision in 1 month'], required: false, employeeOnly: false, customerVisible: true, displayOrder: 9, appointmentTypes: ['Bridal Consultation'] },
  { id: '10', question: 'Previous visits', type: 'yesno', required: false, employeeOnly: false, customerVisible: true, displayOrder: 10, appointmentTypes: ['Bridal Consultation'] },
  { id: '11', question: 'Accessibility requirements', type: 'checkbox', required: false, employeeOnly: false, customerVisible: true, displayOrder: 11, appointmentTypes: ['Bridal Consultation', 'Fitting', 'Alterations', 'Pickup'] },
  { id: '12', question: 'How they heard about the store', type: 'select', options: ['Instagram', 'Word of Mouth', 'Google Search', 'Bridal Show'], required: true, employeeOnly: false, customerVisible: true, displayOrder: 12, appointmentTypes: ['Bridal Consultation'] },
  { id: '13', question: 'Preferred communication method', type: 'select', options: ['SMS', 'Email', 'Phone Call'], required: true, employeeOnly: false, customerVisible: true, displayOrder: 13, appointmentTypes: ['Bridal Consultation', 'Fitting', 'Alterations', 'Pickup'] },
  { id: '14', question: 'Special notes', type: 'longtext', required: false, employeeOnly: false, customerVisible: true, displayOrder: 14, appointmentTypes: ['Bridal Consultation', 'Fitting', 'Alterations', 'Pickup', 'Accessories'] },
];

export const DEFAULT_BOOKING_FEE_SETTINGS: BookingFeeSettings = {
  enabled: true,
  amountCents: 7500,
  organizationDefault: 7500,
  locationOverrides: { 'ido-br': 7500, 'ido-cov': 7500, 'pc-br': 7500, 'pc-cov': 7500 },
  promotionalWaiverEnabled: true,
  employeeWaiverAllowed: true,
  refundable: false,
  creditTowardPurchase: true,
  cancelDeadlineHours: 48,
  rescheduleDeadlineHours: 24,
  noShowTreatment: 'forfeit',
};

export const DEFAULT_CONFIRMATION_SETTINGS: BookingConfirmationSettings = {
  immediateConfirm: true,
  sevenDayRequest: true,
  followUpHours: 24,
  finalReminderHours: 48,
  timezoneAware: true,
  quietHoursStart: '08:00 PM',
  quietHoursEnd: '08:00 AM',
  maxReminders: 3,
};

export const DEFAULT_PAYMENT_TAX_SETTINGS: PaymentTaxSettings = {
  cashEnabled: true,
  checkEnabled: true,
  cardEnabled: true,
  achEnabled: true,
  giftCardEnabled: true,
  storeCreditEnabled: true,
  taxRates: { 'ido-br': 9.45, 'ido-cov': 8.75, 'pc-br': 9.45, 'pc-cov': 8.75 },
  alterationTaxable: true,
  bookingFeeTaxable: false,
  shippingTaxable: true,
};

export const DEFAULT_SALES_SETTINGS: SalesSettings = {
  quoteNumberPrefix: 'QT-',
  invoiceNumberPrefix: 'INV-',
  quoteExpirationDays: 30,
  defaultTerms: 'Thank you for shopping with The Boutique! All sales are final. Deposits are non-refundable.',
  defaultNotes: 'Alterations details will be confirmed during the first fitting.',
  discountLimitPct: 15,
  managerApprovalThresholdCents: 50000, // $500
  invoiceLockOnPost: true,
  signatureRequired: true,
};

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  minPasswordLength: 8,
  requireComplexity: true,
  lockoutAttempts: 5,
  lockoutDurationMinutes: 15,
  sessionDurationMinutes: 120,
  mfaRequired: false,
  idleTimeoutMinutes: 30,
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  provider: 'gemini',
  model: 'Gemini 3.1 Pro (High)',
  temperature: 0.2,
  costLimitCents: 5000,
  dataRetentionDays: 30,
  humanApprovalRequired: true,
};

export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
  brandLogoUrl: '',
  primaryFontFamily: 'Inter',
};

export const DEFAULT_INVENTORY_SETTINGS: InventorySettings = {
  trackingEnabled: true,
  preventNegative: false,
  lowStockThreshold: 5,
  reorderThreshold: 10,
  barcodeFormat: 'CODE128',
  skuGenerationPattern: '{DESIGNER}-{COLOR}-{SIZE}',
};

export const DEFAULT_PURCHASING_SETTINGS: PurchasingSettings = {
  vendors: [
    { id: '1', name: 'Monique Lhuillier', email: 'orders@moniquelhuillier.com', phone: '(212) 683-3332', leadTimeDays: 120, rushLeadTimeDays: 60 },
    { id: '2', name: 'Berta', email: 'info@berta.com', phone: '(305) 573-3333', leadTimeDays: 150, rushLeadTimeDays: 90 },
    { id: '3', name: 'Pronovias', email: 'wholesale@pronovias.com', phone: '(800) 776-6684', leadTimeDays: 90, rushLeadTimeDays: 45 },
  ],
};

export const DEFAULT_TRANSFER_SETTINGS: TransferSettings = {
  enabled: true,
  approvalRequired: true,
  approvalThresholdCents: 100000, // $1000
  minSourceStock: 2,
  transitDaysDefault: 3,
  trackingRequired: true,
  scanRequired: true,
};

export const DEFAULT_TWILIO_SETTINGS: TwilioSettings = {
  connected: true,
  messagingServiceSid: 'MG1a2b3c4d5e6f7g8h9i0j',
  webhookStatus: 'active',
};

export const DEFAULT_AUTOMATIONS: AutomationRule[] = [
  { id: '1', name: 'Send 7-Day Confirmation Request', trigger: '7_days_before_appointment', delayHours: 0, templateId: '1', active: true },
  { id: '2', name: 'DNB Recovery Follow-up', trigger: '3_days_after_dnb', delayHours: 72, templateId: '2', active: false },
];

export const DEFAULT_FEATURE_FLAGS: FeatureFlag[] = [
  { id: '1', name: 'Virtual Atelier Fitting Room', description: 'Enable experimental virtual walkthroughs for brides.', enabled: false, rolloutPct: 0 },
  { id: '2', name: 'AI Stylist Recommender', description: 'Power stylist matching using machine learning.', enabled: true, rolloutPct: 100 },
];


// ─── Database Access Helpers ───

// Legacy fetch/save json functions removed as part of Phase 4 Migration

export const DEFAULT_ALTERATION_SETTINGS: AlterationSettings = {
  services: [
    { id: '1', name: 'Hem', priceCents: 15000, durationMinutes: 60 },
    { id: '2', name: 'Bustle', priceCents: 20000, durationMinutes: 60 }
  ],
  fittingsMax: 3,
  dueBufferDays: 14,
  rushFeeCents: 10000,
  readyTemplate: 'Your alterations are ready.'
};

export async function fetchBookingFeeCents(locationId?: LocationId): Promise<number> {
  const dataPlane = getActiveDataPlane();
  const result = await resolveEffectiveSetting<BookingFeeSettings>(
    'booking_fee_settings',
    'booking_fee_settings',
    { dataPlane, locationId },
    DEFAULT_BOOKING_FEE_SETTINGS
  );
  
  const settings = result.value;
  if (!settings.enabled) return 0;
  if (locationId && settings.locationOverrides && settings.locationOverrides[locationId] !== undefined) {
    return settings.locationOverrides[locationId];
  }
  return settings.amountCents;
}

export async function fetchAlterationSettings(locationId?: LocationId): Promise<AlterationSettings> {
  const dataPlane = getActiveDataPlane();
  const result = await resolveEffectiveSetting<AlterationSettings>(
    'alteration_settings',
    'alteration_settings',
    { dataPlane, locationId },
    DEFAULT_ALTERATION_SETTINGS
  );
  return result.value;
}

// ─── Scoped Configuration Architecture ───

export interface SettingsContext {
  dataPlane: 'production' | 'demo';
  businessId?: string;
  locationId?: string;
  userId?: string;
  effectiveDate?: string;
}

export interface EffectiveSettingResult<T> {
  value: T;
  sourceScope: 'platform' | 'business' | 'location' | 'user' | 'default';
  isDefault: boolean;
  isOverride: boolean;
  version: number;
  updatedAt?: string;
}

export async function resolveEffectiveSetting<T>(
  namespace: string,
  key: string,
  context: SettingsContext,
  defaultValue: T
): Promise<EffectiveSettingResult<T>> {
  try {
    let businessId = context.businessId;
    let userId = context.userId;

    // Automatically resolve userId if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    // Automatically resolve businessId from memberships if not provided
    if (!businessId && userId) {
      const { data: membership } = await supabase
        .from('business_memberships')
        .select('business_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (membership) {
        businessId = membership.business_id;
      } else {
        // Fallback for demo environments if no membership exists
        const { data: defaultBusiness } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
        if (defaultBusiness) businessId = defaultBusiness.id;
      }
    }

    const { data, error } = await supabase
      .from('settings_values')
      .select('*')
      .eq('setting_namespace', namespace)
      .eq('setting_key', key)
      .eq('data_plane', context.dataPlane)
      .eq('status', 'active');

    if (error) throw error;
    if (!data || data.length === 0) {
      return {
        value: defaultValue,
        sourceScope: 'default',
        isDefault: true,
        isOverride: false,
        version: 0,
      };
    }

    // Sort by specificity: user -> location -> business -> platform
    let userSetting, locationSetting, businessSetting, platformSetting;

    for (const record of data) {
      if (record.user_id && record.user_id === context.userId) userSetting = record;
      else if (record.location_id && record.location_id === context.locationId) locationSetting = record;
      else if (record.business_id && record.business_id === context.businessId && !record.location_id) businessSetting = record;
      else if (!record.business_id && !record.location_id && !record.user_id) platformSetting = record;
    }

    const effectiveRecord = userSetting || locationSetting || businessSetting || platformSetting;

    if (!effectiveRecord) {
      return {
        value: defaultValue,
        sourceScope: 'default',
        isDefault: true,
        isOverride: false,
        version: 0,
      };
    }

    let sourceScope: 'platform' | 'business' | 'location' | 'user' = 'platform';
    if (effectiveRecord === userSetting) sourceScope = 'user';
    else if (effectiveRecord === locationSetting) sourceScope = 'location';
    else if (effectiveRecord === businessSetting) sourceScope = 'business';

    const isOverride = sourceScope === 'user' || sourceScope === 'location';

    return {
      value: effectiveRecord.value_json as T,
      sourceScope,
      isDefault: false,
      isOverride,
      version: effectiveRecord.version || 1,
      updatedAt: effectiveRecord.updated_at,
    };
  } catch (err) {
    console.error(`Error resolving effective setting ${namespace}:${key}`, err);
    return {
      value: defaultValue,
      sourceScope: 'default',
      isDefault: true,
      isOverride: false,
      version: 0,
    };
  }
}

export async function saveScopedSetting<T>(
  namespace: string,
  key: string,
  value: T,
  context: SettingsContext,
  reason?: string
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    let businessId = context.businessId;
    if (!businessId && userId) {
      const { data: membership } = await supabase
        .from('business_memberships')
        .select('business_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (membership) {
        businessId = membership.business_id;
      } else {
        const { data: defaultBusiness } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
        if (defaultBusiness) businessId = defaultBusiness.id;
      }
    }

    const matchQuery = {
      data_plane: context.dataPlane,
      setting_namespace: namespace,
      setting_key: key,
      business_id: businessId || null,
      location_id: context.locationId || null,
      user_id: context.userId || null,
    };

    // 1. Fetch existing to increment version and save history
    const { data: existing } = await supabase
      .from('settings_values')
      .select('id, version, value_json')
      .match(matchQuery)
      .maybeSingle();

    const newVersion = existing ? (existing.version || 1) + 1 : 1;

    // 2. Upsert the value
    const upsertData = {
      ...matchQuery,
      value_json: value,
      version: newVersion,
      updated_at: new Date().toISOString(),
      updated_by: userId,
      ...(existing ? {} : { created_by: userId }),
    };

    const { data: savedValue, error } = await supabase
      .from('settings_values')
      .upsert(upsertData, { onConflict: 'data_plane, business_id, location_id, user_id, setting_namespace, setting_key' })
      .select('id')
      .single();

    if (error) throw error;

    // 3. Write version history
    if (savedValue) {
      const { error: versionError } = await supabase
        .from('settings_versions')
        .insert({
          setting_value_id: savedValue.id,
          version: newVersion,
          previous_value_json: existing ? existing.value_json : null,
          new_value_json: value,
          change_reason: reason || null,
          changed_by: userId,
        });
        
      if (versionError) {
        console.error('Failed to write settings version history', versionError);
      }
    }
  } catch (err: any) {
    console.error('Failed to save setting to DB, ignoring for demo purposes:', err);
  }
}


