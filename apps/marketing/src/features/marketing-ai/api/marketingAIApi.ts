import { AIRecommendation, ScenarioResult, CompetitorSignal } from '../types';
import { getActiveDataPlane, supabase } from '@/lib/supabase';

const WORKER_BASE_URL = (import.meta.env.VITE_MARKETING_AI_URL as string | undefined)?.replace(/\/$/, '') || '/api/marketing-ai';

async function authenticatedHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token && getActiveDataPlane() !== 'demo') {
    throw new Error('Sign in again to use Marketing AI.');
  }
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'X-Data-Plane': getActiveDataPlane(),
  };
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = await authenticatedHeaders((init.headers as Record<string, string> | undefined) ?? {});
  return fetch(`${WORKER_BASE_URL}${path}`, { ...init, headers });
}

export async function fetchAIBrief(brand?: string) {
  try {
    const query = brand ? `?brand=${encodeURIComponent(brand)}` : '';
    const res = await apiFetch(`/brief${query}`);
    if (res.ok) return await res.json();
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Marketing AI brief failed (${res.status}).`);
  } catch (e) {
    if (getActiveDataPlane() !== 'demo') throw e;
  }

  return {
    brand: brand || 'Demo Business',
    briefDate: new Date().toISOString().slice(0, 10),
    summaryMd: 'Demo Marketing AI brief. Connect production providers to generate a live tenant brief.',
    topGrowthOpportunities: [],
    topRisks: [],
    recommendedBudgetAdjustments: {},
    isDemo: true,
  };
}

export async function fetchAIRecommendations(brand?: string): Promise<AIRecommendation[]> {
  try {
    const query = brand ? `?brand=${encodeURIComponent(brand)}` : '';
    const res = await apiFetch(`/recommendations${query}`);
    if (res.ok) {
      const data = await res.json();
      return data.recommendations ?? [];
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Marketing AI recommendations failed (${res.status}).`);
  } catch (e) {
    if (getActiveDataPlane() !== 'demo') throw e;
  }

  return [];
}

export async function approveAIRecommendation(id: string) {
  try {
    const res = await apiFetch(`/recommendations/${encodeURIComponent(id)}/approve`, { method: 'POST' });
    if (res.ok) return await res.json();
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Approval failed (${res.status}).`);
  } catch (e) {
    if (getActiveDataPlane() !== 'demo') throw e;
    return { success: true, message: `Demo recommendation ${id} approved locally.` };
  }
}

export async function runDigitalTwinScenario(params: Record<string, unknown>): Promise<ScenarioResult> {
  try {
    const res = await apiFetch('/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) return await res.json();
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Scenario analysis failed (${res.status}).`);
  } catch (e) {
    if (getActiveDataPlane() !== 'demo') throw e;
  }

  return {
    querySummary: 'Demo scenario only. Production forecasts require live campaign and conversion history.',
    predictedSpendCents: 0,
    predictedLeads: 0,
    predictedAppointments: 0,
    predictedSalesCents: 0,
    predictedGrossProfitCents: 0,
    confidenceInterval95: { lowerCents: 0, upperCents: 0 },
    inventoryImpactNotes: 'Demo data only.',
    capacityImpactNotes: 'Demo data only.',
    riskAssessment: 'Insufficient production data',
  };
}

export async function askMarketingCopilot(question: string, brand?: string) {
  try {
    const res = await apiFetch('/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, brand }),
    });
    if (res.ok) return await res.json();
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Marketing copilot failed (${res.status}).`);
  } catch (e) {
    if (getActiveDataPlane() !== 'demo') throw e;
  }

  return {
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content: 'Demo mode: connect production marketing sources before using live marketing recommendations.',
    timestamp: new Date().toISOString(),
    citations: [],
    confidenceScore: 0,
  };
}

export async function fetchCompetitorSignals(brand?: string): Promise<CompetitorSignal[]> {
  try {
    const query = brand ? `?brand=${encodeURIComponent(brand)}` : '';
    const res = await apiFetch(`/competitors${query}`);
    if (res.ok) {
      const data = await res.json();
      return data.signals ?? [];
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Competitor intelligence failed (${res.status}).`);
  } catch (e) {
    if (getActiveDataPlane() !== 'demo') throw e;
  }

  return [];
}
