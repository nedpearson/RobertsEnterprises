import { getActiveDataPlane, supabase } from '@/lib/supabase';
import type { MarketingProvider } from '../types/marketingTypes';

export type IntegrationStatus =
  | 'CONFIGURATION_REQUIRED'
  | 'NOT_CONFIGURED'
  | 'DISCONNECTED'
  | 'AUTHORIZATION_PENDING'
  | 'CONNECTED_UNVERIFIED'
  | 'ACCOUNT_SELECTION_REQUIRED'
  | 'CONNECTED_HEALTHY'
  | 'REAUTHORIZATION_REQUIRED'
  | 'ERROR';

export interface IntegrationSubService {
  id: string;
  label: string;
  description: string;
  configurationEnv?: string[];
  configurationReady: boolean;
}

export interface DiscoveredProviderResource {
  id: string;
  externalId: string;
  name: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface LiveMarketingConnection {
  provider: MarketingProvider;
  title: string;
  category: string;
  description: string;
  authMode: 'oauth2' | 'api_key' | 'internal';
  status: IntegrationStatus;
  configuration: { configured: boolean; missing: string[] };
  externalOrganization: { id?: string | null; name?: string | null; type?: string | null } | null;
  tokenExpiresAt: string | null;
  lastVerifiedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastWebhookAt: string | null;
  lastError: string | null;
  selectedResources: Array<Record<string, unknown>>;
  brandMappings: string[];
  locationMappings: string[];
  grantedScopes: string[];
  expectedScopes: string[];
  missingScopes: string[];
  healthEvidence: Record<string, unknown>;
  subServices: IntegrationSubService[];
}

const configuredWorkerOrigin = import.meta.env.VITE_MARKETING_WORKER_URL?.trim().replace(/\/$/, '');
const WORKER_ORIGIN = configuredWorkerOrigin || (import.meta.env.DEV ? 'http://localhost:8080' : '');

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Data-Plane': getActiveDataPlane(),
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

async function workerRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!WORKER_ORIGIN) {
    throw new Error('VITE_MARKETING_WORKER_URL is not configured for this production deployment.');
  }
  const headers = { ...(await authHeaders()), ...(init.headers || {}) } as Record<string, string>;
  const response = await fetch(`${WORKER_ORIGIN}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || `Integration request failed (${response.status}).`;
    const error = new Error(message) as Error & { payload?: any; status?: number };
    error.payload = payload;
    error.status = response.status;
    throw error;
  }
  return payload as T;
}

export async function listLiveMarketingConnections(): Promise<LiveMarketingConnection[]> {
  const payload = await workerRequest<{ connections: LiveMarketingConnection[] }>('/api/integrations');
  return payload.connections;
}

export async function startProviderOAuth(provider: MarketingProvider, options?: { shop?: string }): Promise<string> {
  const payload = await workerRequest<{ authorizationUrl: string }>(`/api/integrations/${provider}/connect`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  });
  return payload.authorizationUrl;
}

export async function saveProviderApiKey(
  provider: Extract<MarketingProvider, 'klaviyo' | 'call_tracking'>,
  apiKey: string,
  organizationName?: string,
): Promise<LiveMarketingConnection> {
  const payload = await workerRequest<{ connection: LiveMarketingConnection }>(`/api/integrations/${provider}/credentials`, {
    method: 'POST',
    body: JSON.stringify({ apiKey, organizationName }),
  });
  return payload.connection;
}

export async function testLiveMarketingConnection(provider: MarketingProvider): Promise<LiveMarketingConnection> {
  const payload = await workerRequest<{ connection: LiveMarketingConnection }>(`/api/integrations/${provider}/test`, {
    method: 'POST',
    body: '{}',
  });
  return payload.connection;
}

export async function discoverProviderResources(provider: MarketingProvider): Promise<{
  resources: DiscoveredProviderResource[];
  warnings: string[];
}> {
  return workerRequest(`/api/integrations/${provider}/resources/discover`);
}

export async function disconnectLiveMarketingConnection(provider: MarketingProvider): Promise<LiveMarketingConnection> {
  const payload = await workerRequest<{ connection: LiveMarketingConnection }>(`/api/integrations/${provider}`, {
    method: 'DELETE',
  });
  return payload.connection;
}

export async function provisionWebsiteIntake(): Promise<{
  connection: LiveMarketingConnection;
  endpoint: string;
  signingSecret: string;
  signingInstructions: string;
}> {
  return workerRequest('/api/integrations/web_forms/provision', {
    method: 'POST',
    body: '{}',
  });
}

export async function saveProviderResourceMappings(
  provider: MarketingProvider,
  params: { resources: Array<Record<string, unknown>>; brandMappings: string[]; locationMappings: string[] },
): Promise<LiveMarketingConnection> {
  const payload = await workerRequest<{ connection: LiveMarketingConnection }>(`/api/integrations/${provider}/resources`, {
    method: 'PUT',
    body: JSON.stringify(params),
  });
  return payload.connection;
}
