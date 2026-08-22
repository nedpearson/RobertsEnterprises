import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGrowthConnections, useGrowthSummary, useBusinessId } from './useGrowth';
import {
  addGrowthCompetitor,
  buildMoneyMap,
  calculateGrowthDataHealth,
  fetchCampaignPerformance,
  fetchGrowthCompetitors,
  fetchGrowthCompetitorSignals,
  fetchGrowthRecommendations,
  removeGrowthCompetitor,
  setGrowthRecommendationStatus,
} from './intelligenceService';
import { fetchLatestGrowthDataHealth } from './dataHealthService';
import type {
  CampaignPerformance,
  GrowthAIRecommendation,
  GrowthCompetitor,
  GrowthCompetitorSignal,
  GrowthDataHealth,
  MoneyMapChannel,
} from './types';

export interface IntelligenceAsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function useTenantAsync<T>(
  loader: (businessId: string) => Promise<T>,
  initial: T,
  deps: unknown[] = [],
): IntelligenceAsyncState<T> {
  const businessId = useBusinessId();
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loader(businessId)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, nonce, ...deps]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, refresh };
}

export function useCampaignPerformance(days = 30): IntelligenceAsyncState<CampaignPerformance[]> {
  return useTenantAsync((businessId) => fetchCampaignPerformance(businessId, days), [], [days]);
}

export function useMoneyMap(days = 30): IntelligenceAsyncState<MoneyMapChannel[]> {
  const campaignState = useCampaignPerformance(days);
  return {
    data: useMemo(() => buildMoneyMap(campaignState.data), [campaignState.data]),
    loading: campaignState.loading,
    error: campaignState.error,
    refresh: campaignState.refresh,
  };
}

export function useGrowthAIRecommendations(): IntelligenceAsyncState<GrowthAIRecommendation[]> {
  return useTenantAsync((businessId) => fetchGrowthRecommendations(businessId), []);
}

export function useGrowthCompetitors(): IntelligenceAsyncState<GrowthCompetitor[]> {
  return useTenantAsync((businessId) => fetchGrowthCompetitors(businessId), []);
}

export function useGrowthCompetitorSignals(): IntelligenceAsyncState<GrowthCompetitorSignal[]> {
  return useTenantAsync((businessId) => fetchGrowthCompetitorSignals(businessId), []);
}

/**
 * Prefer the persisted reconciliation health snapshot because it knows actual
 * lead/appointment/payment attribution coverage. Fall back to connection-only
 * scoring before the first reconciliation run; never manufacture coverage.
 */
export function useGrowthDataHealth(days = 30): IntelligenceAsyncState<GrowthDataHealth> {
  const persisted = useTenantAsync<GrowthDataHealth | null>(fetchLatestGrowthDataHealth, null);
  const connections = useGrowthConnections();
  const summary = useGrowthSummary(days);
  const fallbackCoverage = summary.data?.attributionCoveragePct ?? null;
  const fallback = useMemo(
    () => calculateGrowthDataHealth(connections.data, fallbackCoverage),
    [connections.data, fallbackCoverage],
  );
  const data = persisted.data ?? fallback;

  return {
    data,
    loading: persisted.loading || connections.loading || summary.loading,
    // Persisted-health failure should not blank the command center; connection
    // health remains usable and the error is still surfaced diagnostically.
    error: persisted.error || connections.error || summary.error,
    refresh: useCallback(() => {
      persisted.refresh();
      connections.refresh();
      summary.refresh();
    }, [persisted.refresh, connections.refresh, summary.refresh]),
  };
}

export function useGrowthCompetitorActions() {
  const businessId = useBusinessId();
  return {
    add: useCallback(
      async (input: { name: string; websiteUrl?: string | null; locationId?: string | null }) => {
        if (!businessId) throw new Error('No active business context.');
        await addGrowthCompetitor(businessId, input);
      },
      [businessId],
    ),
    remove: useCallback(
      async (competitorId: string) => {
        if (!businessId) throw new Error('No active business context.');
        await removeGrowthCompetitor(businessId, competitorId);
      },
      [businessId],
    ),
  };
}

export function useGrowthRecommendationActions() {
  const businessId = useBusinessId();
  return {
    setStatus: useCallback(
      async (recommendationId: string, status: GrowthAIRecommendation['status']) => {
        if (!businessId) throw new Error('No active business context.');
        await setGrowthRecommendationStatus(businessId, recommendationId, status);
      },
      [businessId],
    ),
  };
}
