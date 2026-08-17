/**
 * React hooks for the Growth section.
 *
 * One hook per tab's data need. Each resolves the tenant from AuthContext, so a
 * component never has to know about business_id, and each returns a uniform
 * { data, loading, error, refresh } shape so tabs can render loading and empty
 * states consistently.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVowosData } from '@/contexts/VowosDataContext';
import {
  fetchChannelSpend,
  fetchConnections,
  fetchLocalListings,
  fetchLocalMetrics,
  fetchReviews,
  fetchSearchMetrics,
  fetchTouchpoints,
  rollUpChannels,
} from './growthService';
import type {
  ChannelSpend,
  GrowthReview,
  GrowthSummary,
  LocalListing,
  LocalMetric,
  ProviderConnection,
  SearchMetric,
} from './types';

export interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** In the demo plane there is no auth session; the sandbox tenant id stands in. */
export const DEMO_BUSINESS_ID = 'demo-business';

export function useBusinessId(): string | null {
  const { tenant, session } = useAuth();
  if (tenant?.id) return tenant.id;
  // Anonymous /demoapp visitors still need a stable scope key.
  if (!session) return DEMO_BUSINESS_ID;
  return null;
}

function useAsync<T>(loader: (businessId: string) => Promise<T>, initial: T, deps: unknown[] = []): AsyncState<T> {
  const businessId = useBusinessId();
  const [data, setData] = useState<T>(initial);
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

export function useGrowthConnections(): AsyncState<ProviderConnection[]> {
  return useAsync<ProviderConnection[]>((id) => fetchConnections(id), []);
}

export function useReviews(status?: string): AsyncState<GrowthReview[]> {
  return useAsync<GrowthReview[]>((id) => fetchReviews(id, { status }), [], [status]);
}

export function useLocalListings(): AsyncState<LocalListing[]> {
  return useAsync<LocalListing[]>((id) => fetchLocalListings(id), []);
}

export function useLocalMetrics(days = 30): AsyncState<LocalMetric[]> {
  return useAsync<LocalMetric[]>((id) => fetchLocalMetrics(id, days), [], [days]);
}

export function useSearchMetrics(days = 28): AsyncState<SearchMetric[]> {
  return useAsync<SearchMetric[]>((id) => fetchSearchMetrics(id, days), [], [days]);
}

export function useChannelSpend(days = 30): AsyncState<ChannelSpend[]> {
  return useAsync<ChannelSpend[]>((id) => fetchChannelSpend(id, days), [], [days]);
}

/**
 * The Growth Overview rollup: ad spend joined to attributed leads, appointments
 * and collected revenue. Operational data comes from VowosDataContext (already
 * loaded for the rest of the app) so this adds two queries, not seven.
 */
export function useGrowthSummary(rangeDays = 30): AsyncState<GrowthSummary | null> {
  const businessId = useBusinessId();
  const { leads, appointments, invoices, brides } = useVowosData();
  const [spend, setSpend] = useState<ChannelSpend[] | null>(null);
  const [touchpoints, setTouchpoints] = useState<Awaited<ReturnType<typeof fetchTouchpoints>> | null>(null);
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
    Promise.all([fetchChannelSpend(businessId, rangeDays), fetchTouchpoints(businessId, rangeDays)])
      .then(([s, t]) => {
        if (cancelled) return;
        setSpend(s);
        setTouchpoints(t);
        setError(null);
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
  }, [businessId, rangeDays, nonce]);

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - rangeDays);
    return d;
  }, [rangeDays]);

  const data = useMemo<GrowthSummary | null>(() => {
    if (!spend || !touchpoints || !businessId) return null;

    // Revenue actually collected, keyed by the customer name the invoice carries.
    const bridesByName = new Map(brides.map((b) => [b.name, b.id]));
    const revenueByCustomerCents: Record<string, number> = {};
    for (const inv of invoices) {
      const customerId = bridesByName.get(inv.customer);
      if (!customerId) continue;
      revenueByCustomerCents[customerId] = (revenueByCustomerCents[customerId] ?? 0) + (inv.paidCents ?? 0);
    }

    const bookedLeadIds = new Set<string>();
    const leadsByName = new Map(leads.map((l) => [l.name, l.id]));
    for (const appt of appointments) {
      const leadId = leadsByName.get(appt.customer);
      if (leadId) bookedLeadIds.add(leadId);
    }
    // A lead that reached a won stage counts as booked even without an appointment row.
    for (const lead of leads) {
      if (['Won', 'Booked', 'Appointment'].includes(String(lead.stage))) bookedLeadIds.add(lead.id);
    }

    const newCustomerIds = new Set(
      brides.filter((b) => !('createdAt' in b) || new Date((b as { createdAt?: string }).createdAt ?? 0) >= cutoff).map((b) => b.id),
    );

    return rollUpChannels({
      businessId,
      rangeDays,
      spend,
      touchpoints,
      revenueByCustomerCents,
      bookedLeadIds,
      newCustomerIds,
    });
  }, [spend, touchpoints, businessId, rangeDays, leads, appointments, invoices, brides, cutoff]);

  return { data, loading, error, refresh: useCallback(() => setNonce((n) => n + 1), []) };
}
