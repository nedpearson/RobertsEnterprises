/**
 * Failure Classifier & Root Cause Analysis Engine
 * VowOS Integration Operations & Auto-Recovery System
 */

import { ClassifiedFailure, FailureCategory } from './types';

export interface ClassifyErrorOptions {
  hasRefreshToken?: boolean;
  statusCode?: number;
  headers?: Record<string, string | number | undefined>;
  endpoint?: string;
}

/**
 * Parses Retry-After header which can be either seconds (integer) or HTTP-Date.
 */
export function parseRetryAfter(retryAfterValue: string | number | undefined, nowMs: number = Date.now()): number {
  if (retryAfterValue === undefined || retryAfterValue === null) {
    return 60;
  }

  if (typeof retryAfterValue === 'number') {
    return Math.max(1, Math.round(retryAfterValue));
  }

  const numeric = parseInt(retryAfterValue, 10);
  if (!isNaN(numeric) && String(numeric) === retryAfterValue.trim()) {
    return Math.max(1, numeric);
  }

  // Attempt to parse HTTP Date format (e.g. Wed, 21 Oct 2026 07:28:00 GMT)
  const parsedDate = Date.parse(retryAfterValue);
  if (!isNaN(parsedDate)) {
    const diffSeconds = Math.round((parsedDate - nowMs) / 1000);
    return Math.max(1, diffSeconds);
  }

  return 60;
}

/**
 * Calculates exponential backoff clamped between minSeconds and maxSeconds.
 */
export function calculateBackoff(attempt: number, baseSeconds: number = 5, maxSeconds: number = 300): number {
  const calculated = Math.pow(2, Math.max(0, attempt)) * baseSeconds;
  return Math.min(maxSeconds, Math.max(baseSeconds, calculated));
}

/**
 * Classifies raw API / webhook errors into canonical failure categories,
 * determines whether automated remediation is possible, and provides actionable root-cause forensics.
 */
export function classifyError(
  error: unknown,
  provider: string,
  businessId: string,
  options?: ClassifyErrorOptions
): ClassifiedFailure {
  const errObj = (typeof error === 'object' && error !== null) ? (error as Record<string, any>) : {};

  // Extract raw error string
  const raw = error instanceof Error
    ? `${error.name}: ${error.message}`
    : typeof error === 'string'
      ? error
      : (errObj.message || errObj.error || JSON.stringify(error) || String(error));

  const rawLower = raw.toLowerCase();

  // Extract status code
  let statusCode: number | undefined = options?.statusCode;
  if (statusCode === undefined) {
    if (typeof errObj.status === 'number') statusCode = errObj.status;
    else if (typeof errObj.statusCode === 'number') statusCode = errObj.statusCode;
    else if (typeof errObj.response?.status === 'number') statusCode = errObj.response.status;
  }

  // Extract headers
  const headers = options?.headers || errObj.headers || errObj.response?.headers || {};
  const retryAfterHeader = headers['retry-after'] || headers['Retry-After'];

  // Check refresh token existence
  const hasRefreshToken = options?.hasRefreshToken ?? (errObj.hasRefreshToken === true);

  // 1. Rate Limiting (429 / Quota / Throttled)
  if (
    statusCode === 429 ||
    raw.includes('429') ||
    rawLower.includes('rate limit') ||
    rawLower.includes('too many requests') ||
    rawLower.includes('quota exceeded') ||
    rawLower.includes('throttled')
  ) {
    const retryAfterSeconds = typeof errObj.retryAfter === 'number'
      ? errObj.retryAfter
      : parseRetryAfter(retryAfterHeader);

    return {
      category: 'RATE_LIMITED',
      provider,
      businessId,
      statusCode: 429,
      retryAfterSeconds,
      isAutoRepairable: true,
      rootCause: `Provider ${provider} returned 429 Too Many Requests (Rate limit exceeded).`,
      suggestedAction: `Apply bounded exponential backoff and resume after ${retryAfterSeconds}s.`,
      rawError: raw
    };
  }

  // 2. Authentication & Revocation (401 / Invalid Grant / OAuth Expired / Revoked)
  if (
    statusCode === 401 ||
    raw.includes('401') ||
    raw.includes('invalid_grant') ||
    raw.includes('OAuthException') ||
    rawLower.includes('app_uninstalled') ||
    rawLower.includes('token revoked') ||
    rawLower.includes('token expired') ||
    rawLower.includes('unauthorized') ||
    rawLower.includes('invalid access token')
  ) {
    // If explicitly revoked or uninstalled, it cannot be auto-refreshed even if refresh token exists
    const isExplicitlyRevoked = rawLower.includes('app_uninstalled') || rawLower.includes('token revoked') || rawLower.includes('revoked');

    if (hasRefreshToken && !isExplicitlyRevoked) {
      return {
        category: 'AUTH_EXPIRED',
        provider,
        businessId,
        statusCode: 401,
        isAutoRepairable: true,
        rootCause: `Access token for ${provider} expired, but valid refresh token exists.`,
        suggestedAction: `Execute automated OAuth token refresh using stored refresh token.`,
        rawError: raw
      };
    }

    return {
      category: 'AUTH_REVOKED',
      provider,
      businessId,
      statusCode: 401,
      isAutoRepairable: false,
      rootCause: `OAuth authorization revoked by user or application uninstalled in ${provider}.`,
      suggestedAction: `Transition status to ACTION_REQUIRED and generate signed OAuth reconnection URL.`,
      rawError: raw
    };
  }

  // 3. Webhook Missing / Drift / Misconfigured
  if (
    statusCode === 404 && (rawLower.includes('webhook') || rawLower.includes('subscription')) ||
    raw.includes('WEBHOOK_MISSING') ||
    rawLower.includes('webhook subscription not found') ||
    rawLower.includes('webhook_drift') ||
    rawLower.includes('webhook not found')
  ) {
    return {
      category: 'WEBHOOK_MISSING',
      provider,
      businessId,
      statusCode: 404,
      isAutoRepairable: true,
      rootCause: `Registered webhook subscription in ${provider} is missing or endpoint URL drifted.`,
      suggestedAction: `Automatically re-register webhook subscriptions with valid endpoint and secret.`,
      rawError: raw
    };
  }

  if (raw.includes('WEBHOOK_MISCONFIGURED') || rawLower.includes('invalid webhook hmac') || rawLower.includes('webhook signature mismatch')) {
    return {
      category: 'WEBHOOK_MISCONFIGURED',
      provider,
      businessId,
      statusCode: 400,
      isAutoRepairable: true,
      rootCause: `Webhook signature verification failed or secret mismatch for ${provider}.`,
      suggestedAction: `Resynchronize webhook signing secrets from provider configuration.`,
      rawError: raw
    };
  }

  // 4. Google Drive Watch Channel Expired / Calendar 410 Gone / Sync Token Invalidation
  if (
    statusCode === 410 ||
    raw.includes('CHANNEL_EXPIRED') ||
    raw.includes('410') ||
    rawLower.includes('channel expired') ||
    rawLower.includes('channel not found') ||
    rawLower.includes('sync token is invalid') ||
    rawLower.includes('sync token expired')
  ) {
    return {
      category: 'CHANNEL_EXPIRED' as FailureCategory,
      provider,
      businessId,
      statusCode: 410,
      isAutoRepairable: true,
      rootCause: `Google Drive watch channel or Calendar sync token expired or invalidated (HTTP 410).`,
      suggestedAction: `Generate new channel UUID or fallback to full delta sync scan.`,
      rawError: raw
    };
  }

  // 5. Provider Outage / Circuit Breaker Open
  if (raw.includes('CIRCUIT_OPEN') || raw.includes('PROVIDER_OUTAGE') || rawLower.includes('service unavailable') && statusCode === 503) {
    return {
      category: 'PROVIDER_OUTAGE',
      provider,
      businessId,
      statusCode: statusCode || 503,
      isAutoRepairable: false,
      rootCause: `Provider ${provider} is experiencing an outage or circuit breaker is OPEN.`,
      suggestedAction: `Pause automated calls until provider health checks pass.`,
      rawError: raw
    };
  }

  // 6. Schema Mismatch / Malformed Webhook Payload
  if (
    raw.includes('SyntaxError') ||
    raw.includes('Unexpected token') ||
    raw.includes('SCHEMA_MISMATCH') ||
    raw.includes('SCHEMA_DRIFT') ||
    rawLower.includes('invalid json') ||
    rawLower.includes('failed to parse json')
  ) {
    return {
      category: 'SCHEMA_DRIFT',
      provider,
      businessId,
      statusCode: 400,
      isAutoRepairable: false,
      rootCause: `Incoming webhook payload could not be parsed or failed schema validation.`,
      suggestedAction: `Route payload to Dead Letter Queue (DLQ) for inspection and replay.`,
      rawError: raw
    };
  }

  // 7. Resource Not Found (404 for entity)
  if (statusCode === 404 || rawLower.includes('not found')) {
    return {
      category: 'RESOURCE_NOT_FOUND',
      provider,
      businessId,
      statusCode: 404,
      isAutoRepairable: false,
      rootCause: `Target resource was not found on provider ${provider}.`,
      suggestedAction: `Check entity ID or sync cursor range.`,
      rawError: raw
    };
  }

  // 8. Transient 5xx / Network / Gateway Timeout
  if (
    (statusCode && statusCode >= 500 && statusCode <= 504) ||
    rawLower.includes('econnreset') ||
    rawLower.includes('etimedout') ||
    rawLower.includes('network error') ||
    rawLower.includes('fetch failed') ||
    rawLower.includes('gateway timeout') ||
    rawLower.includes('bad gateway')
  ) {
    return {
      category: 'TRANSIENT_5XX',
      provider,
      businessId,
      statusCode: statusCode || 500,
      isAutoRepairable: true,
      rootCause: `Provider ${provider} returned transient HTTP ${statusCode || 500} server or network error.`,
      suggestedAction: `Queue retry with exponential backoff and track circuit breaker failure count.`,
      rawError: raw
    };
  }

  // Default Fallback
  return {
    category: 'TRANSIENT_5XX',
    provider,
    businessId,
    statusCode: statusCode || 500,
    isAutoRepairable: true,
    rootCause: `Unclassified error from ${provider}: ${raw.slice(0, 150)}`,
    suggestedAction: `Retry with exponential backoff.`,
    rawError: raw
  };
}
