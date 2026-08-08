import { Lead, LeadStage } from '@/data/vowosData';
import { MarketingProvider } from '../types/marketingTypes';

export interface WebhookLeadPayload {
  provider: MarketingProvider;
  externalLeadId: string;
  formId: string;
  campaignName: string;
  fullName: string;
  email: string;
  phone?: string;
  weddingDate?: string;
  budgetCents?: number;
  source: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  leadId: string;
  name: string;
  email: string;
  stage: LeadStage;
  autoResponseSent: boolean;
  timestamp: string;
}

/** Process incoming webhook lead payload from Meta, Google, or TikTok Lead Forms */
export function processIncomingAdLeadWebhook(payload: WebhookLeadPayload): WebhookProcessingResult {
  const newLeadId = `lead-wh-${Date.now()}`;
  const timestamp = new Date().toISOString();

  // Simulate automated SMS / Email welcome response
  const autoResponseSent = true;

  return {
    success: true,
    leadId: newLeadId,
    name: payload.fullName,
    email: payload.email,
    stage: 'New',
    autoResponseSent,
    timestamp,
  };
}
