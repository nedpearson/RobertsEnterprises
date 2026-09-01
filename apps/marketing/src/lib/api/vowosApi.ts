import { supabase } from '@/lib/supabase';

const apiBase = () => (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class VowosApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'VowosApiError';
    this.status = status;
    this.code = code;
  }
}

export async function vowosApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new VowosApiError('Your session has expired. Sign in again.', 401, 'SESSION_REQUIRED');

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  const response = await fetch(`${apiBase()}${normalizedPath}`, { ...init, headers });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message = typeof body === 'object' && body && 'error' in body
      ? String((body as { error?: unknown }).error || `Request failed (${response.status})`)
      : typeof body === 'string' && body.trim()
        ? body
        : `Request failed (${response.status})`;
    const code = typeof body === 'object' && body && 'code' in body
      ? String((body as { code?: unknown }).code || '') || undefined
      : undefined;
    throw new VowosApiError(message, response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return body as T;
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}
