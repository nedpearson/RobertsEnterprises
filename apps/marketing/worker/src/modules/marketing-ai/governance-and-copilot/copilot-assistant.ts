import { GovernanceEngine } from './governance';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: string[];
  actionPreview?: {
    actionType: string;
    description: string;
    financialExposureCents: number;
    requiresConfirmation: boolean;
  };
  confidenceScore?: number;
}

export class ExecutiveCopilotAssistant {
  public static async processUserQuestion(question: string, brand: string): Promise<CopilotMessage> {
    const sanitizedQuestion = GovernanceEngine.sanitizePromptInput(question);
    const lower = sanitizedQuestion.toLowerCase();

    let reply = `Analyzing VowOS data for ${brand}...`;
    const citations: string[] = ['VowOS Ledger', 'Meta Ads API Reporting', 'Shopify Analytics'];
    let actionPreview: CopilotMessage['actionPreview'] = undefined;

    if (lower.includes('budget') || lower.includes('reallocate') || lower.includes('spend')) {
      reply = `Based on the last 30 days of data for ${brand}, Google Search Ads are producing a higher marginal return on incremental gross profit ($1.45 per $1 spent) compared to Meta Ads ($1.25). 

We recommend reallocating $500 from low-performing Meta retargeting to Google Search for Baton Rouge bridal appointments.`;
      actionPreview = {
        actionType: 'reallocate_budget',
        description: 'Shift $500 from Meta Ads to Google Search Ads',
        financialExposureCents: 50000,
        requiresConfirmation: true
      };
    } else if (lower.includes('creative') || lower.includes('fatigue')) {
      reply = `The "Summer Linen Dress Styling Video" creative has reached 48,200 impressions with a fatigue risk score of 78%. Click-through rate has declined by 22% over the past 7 days. We recommend replacing this ad creative with the newly uploaded "Coastal Midi Reel".`;
    } else {
      reply = `For ${brand}, current ad spend is on track at 64% of monthly cap. Appointment attendance in Baton Rouge is at 90.2% and Covington is at 84.5%. Incremental gross profit after ad expense is estimated at $14,250 for the current period.`;
    }

    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString(),
      citations,
      actionPreview,
      confidenceScore: 0.96
    };
  }
}
