/**
 * VowOS Typed API Client
 * 
 * Centralized HTTP client for all API communication.
 * Features: JWT injection, boutique scoping, typed errors,
 * pagination unwrapping, abort control, auto-logout on 401.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ─── Types ───

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

// ─── Token Management ───

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('vowos_token', token);
  } else {
    localStorage.removeItem('vowos_token');
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  authToken = localStorage.getItem('vowos_token');
  return authToken;
}

export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

// ─── Boutique Scope ───

let activeBoutiqueId: number | null = null;

export function setActiveBoutique(id: number | null) {
  activeBoutiqueId = id;
}

export function getActiveBoutique(): number | null {
  return activeBoutiqueId;
}

// ─── Request Builder ───

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  /** Skip auth header (for login/public endpoints) */
  noAuth?: boolean;
  /** Timeout in ms (default 30000) */
  timeout?: number;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, API_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

function buildHeaders(noAuth?: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  const token = getAuthToken();
  if (token && !noAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const boutique = getActiveBoutique();
  if (boutique) {
    headers['X-Boutique-Id'] = String(boutique);
  }
  
  return headers;
}

// ─── Core Request ───

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    params,
    signal,
    noAuth = false,
    timeout = 30000,
  } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Combine external signal with timeout
  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;
  
  const url = buildUrl(path, params);
  
  if (import.meta.env.DEV) {
    console.debug(`[API] ${method} ${path}`, params || '');
  }
  
  try {
    const response = await fetch(url, {
      method,
      headers: buildHeaders(noAuth),
      body: body ? JSON.stringify(body) : undefined,
      signal: combinedSignal,
    });
    
    clearTimeout(timeoutId);
    
    // Handle 401 Unauthorized — auto logout
    if (response.status === 401) {
      setAuthToken(null);
      if (onUnauthorized) onUnauthorized();
      throw new ApiClientError(401, 'Session expired. Please log in again.');
    }
    
    // Handle 403 Forbidden
    if (response.status === 403) {
      throw new ApiClientError(403, 'Access denied. You do not have permission for this action.', 'FORBIDDEN');
    }
    
    // Handle other errors
    if (!response.ok) {
      let errorMessage = `Request failed (${response.status})`;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.error || errorBody.message || errorMessage;
      } catch {
        // response wasn't JSON
      }
      throw new ApiClientError(response.status, errorMessage);
    }
    
    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }
    
    const data = await response.json();
    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof ApiClientError) throw error;
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError(0, 'Request was cancelled or timed out.', 'ABORT');
    }
    
    throw new ApiClientError(0, 'Network error. Please check your connection and try again.', 'NETWORK');
  }
}

// ─── Convenience Methods ───

export const api = {
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>, signal?: AbortSignal): Promise<T> {
    return request<T>(path, { method: 'GET', params, signal });
  },
  
  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return request<T>(path, { method: 'POST', body, ...options });
  },
  
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'PUT', body });
  },
  
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'PATCH', body });
  },
  
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
  
  /** For login and other public endpoints */
  publicPost<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body, noAuth: true });
  },
};

/**
 * Unwrap a paginated API response, handling both envelope format
 * ({ data: [...], total, page, limit }) and plain arrays.
 */
export function unwrapPaginated<T>(response: unknown): { data: T[]; total: number } {
  if (!response) return { data: [], total: 0 };
  
  // If it's already an array, wrap it
  if (Array.isArray(response)) {
    return { data: response as T[], total: response.length };
  }
  
  // If it has a data property that's an array, it's paginated
  const envelope = response as Record<string, unknown>;
  if (Array.isArray(envelope.data)) {
    return {
      data: envelope.data as T[],
      total: typeof envelope.total === 'number' ? envelope.total : envelope.data.length,
    };
  }
  
  // Fallback: look for any array property
  for (const key of Object.keys(envelope)) {
    if (Array.isArray(envelope[key])) {
      const arr = envelope[key] as T[];
      return { data: arr, total: arr.length };
    }
  }
  
  return { data: [], total: 0 };
}
