import { normalizeError } from './errors';
import type { AppError } from './errors';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  skipAuth?: boolean;
}

export async function requestClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, skipAuth, headers, ...restOptions } = options;

  // Construct URL with query parameters
  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Construct headers
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has('Content-Type') && !(restOptions.body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  // Attach Authentication Token
  if (!skipAuth) {
    const token = localStorage.getItem('vowos_token');
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  // Attach Boutique Scope Header
  const activeBoutique = localStorage.getItem('vowos_active_boutique');
  if (activeBoutique) {
    requestHeaders.set('x-boutique-id', activeBoutique);
  }

  // Generate unique Request Correlation ID
  const correlationId = `req_${Math.random().toString(36).substring(2, 11)}`;
  requestHeaders.set('x-correlation-id', correlationId);

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
    });

    if (!response.ok) {
      let errBody: any = {};
      try {
        errBody = await response.json();
      } catch {
        // Fallback if not JSON
      }
      
      const appErr: AppError = {
        code: errBody.code || `HTTP_${response.status}`,
        message: errBody.error || errBody.message || response.statusText || 'An API error occurred.',
        status: response.status,
        correlationId,
        fieldErrors: errBody.fieldErrors,
        retryable: response.status >= 500 || response.status === 429,
        original: errBody,
      };
      throw appErr;
    }

    // Handle empty response bodies safely
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers ? (response.headers.get('Content-Type') || '') : '';
    if (contentType.includes('application/json')) {
      return await response.json() as T;
    }
    
    if (typeof response.text === 'function') {
      return await response.text() as unknown as T;
    }
    
    return {} as unknown as T;
  } catch (error) {
    throw normalizeError(error);
  }
}
