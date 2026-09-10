import React, { useMemo, useState } from 'react';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import { useVowosData } from '@/contexts/VowosDataContext';
import { useAppointments, useAppointmentRequestCount } from '@/lib/services/schedulingService';
import { StatTile } from '@/components/vowos/primitives/StatTile';
import { formatCents } from '@/data/vowosData';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiRowProps {
  businessId?: string;
  locationId: string | 'all';
}

type RevenuePeriod = 'MTD' | 'YTD' | 'LAST_YEAR' | 'ALL_TIME';

/**
 * Four KPI tiles: Open Leads, Appointments Today, Requests Awaiting, Revenue MTD.
 * All values come from live data. No hard-coded numbers.
 */
export function KpiRow({ businessId, locationId }: KpiRowProps) {
  const { navigateToView } = useApplicationRoute();
  const { leads, invoices } = useVowosData();
  const { data: appointments = [], isLoading: apptLoading } = useAppointments(businessId, locationId);
  const { data: requestCount = 0, isLoading: reqLoading } = useAppointmentRequestCount(businessId, locationId, 'active');

  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('MTD');

  // Open leads: not closed/lost/converted
  const openLeads = useMemo(() =>
    leads.filter(l => !['closed', 'lost', 'converted'].includes((l.stage || '').toLowerCase())).length,
    [leads]
  );

  // Appointments today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayApptCount = useMemo(() =>
    appointments.filter(a => {
      const ds = a.start_at ? a.start_at.slice(0, 10) : a.date;
      return ds === todayStr;
    }).length,
    [appointments, todayStr]
  );

  // Dynamic Revenue Computation
  const { currentRev, priorRev, invoiceCount } = useMemo(() => {
    let cur = 0;
    let pri = 0;
    let cnt = 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    invoices.forEach(inv => {
      const d = new Date(inv.dueDate || Date.now());
      const m = d.getMonth();
      const y = d.getFullYear();
      const val = inv.paidCents || 0;

      if (revenuePeriod === 'MTD') {
        if (y === currentYear && m === currentMonth) {
          cur += val;
          cnt++;
        } else if ((y === currentYear && m === currentMonth - 1) || (currentMonth === 0 && y === currentYear - 1 && m === 11)) {
          pri += val;
        }
      } else if (revenuePeriod === 'YTD') {
        if (y === currentYear) {
          cur += val;
          cnt++;
        } else if (y === currentYear - 1) {
          pri += val;
        }
      } else if (revenuePeriod === 'LAST_YEAR') {
        if (y === currentYear - 1) {
          cur += val;
          cnt++;
        } else if (y === currentYear - 2) {
          pri += val;
        }
      } else if (revenuePeriod === 'ALL_TIME') {
        cur += val;
        cnt++;
      }
    });

    return { currentRev: cur, priorRev: pri, invoiceCount: cnt };
  }, [invoices, revenuePeriod]);

  // 7-day sparkline data for leads (approximate from all leads, last 7 groups)
  const leadsSparkline = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, openLeads];
    leads.forEach(l => {
      const d = new Date((l as any).createdAt || (l as any).created_at || Date.now());
      const daysAgo = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo >= 0 && daysAgo < 6) {
        counts[5 - daysAgo]++;
      }
    });
    counts[6] = openLeads;
    return counts;
  }, [leads, openLeads]);

  // 7-day sparkline for appointments (last 7 days count)
  const apptSparkline = useMemo(() => {
    const buckets = Array(7).fill(0);
    appointments.forEach(a => {
      const ds = a.start_at ? a.start_at.slice(0, 10) : a.date;
      if (!ds) return;
      const d = new Date(ds);
      const daysAgo = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo >= 0 && daysAgo < 7) buckets[6 - daysAgo]++;
    });
    return buckets;
  }, [appointments]);

  // Render trend subtext for revenue
  const renderRevenueSubtext = () => {
    if (revenuePeriod === 'ALL_TIME') return `From ${invoiceCount} lifetime invoices`;
    
    let trend = 0;
    if (priorRev > 0) trend = ((currentRev - priorRev) / priorRev) * 100;
    else if (currentRev > 0) trend = 100;

    return (
      <div className="flex items-center gap-1.5 mt-2">
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground">vs. prior</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatTile
        tourId="stat-leads"
        label="Open Leads"
        value={openLeads}
        sub={`${leads.length} total in pipeline`}
        sparklineData={leadsSparkline}
        onClick={() => navigateToView('growth', { tab: 'leads' })}
      />
      <StatTile
        tourId="stat-appointments"
        label="Appointments Today"
        value={todayApptCount}
        sub={`${appointments.length} total on books`}
        sparklineData={apptSparkline}
        loading={apptLoading}
        onClick={() => navigateToView('appointments', { tab: 'calendar' })}
      />
      <StatTile
        tourId="stat-requests"
        label="Requests Awaiting"
        value={requestCount}
        sub="Booking requests pending"
        loading={reqLoading}
        onClick={() => navigateToView('appointments', { tab: 'booking-requests' })}
      />
      <StatTile
        tourId="stat-revenue"
        label={
          <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground">Revenue</span>
            <select
              value={revenuePeriod}
              onChange={(e) => setRevenuePeriod(e.target.value as RevenuePeriod)}
              className="bg-transparent text-[10px] font-semibold text-stone-500 uppercase tracking-wider outline-none cursor-pointer hover:text-stone-800 transition-colors"
            >
              <option value="MTD">MTD</option>
              <option value="YTD">YTD</option>
              <option value="LAST_YEAR">Last Year</option>
              <option value="ALL_TIME">All Time</option>
            </select>
          </div>
        }
        value={formatCents(currentRev)}
        sub={renderRevenueSubtext()}
        onClick={() => navigateToView('reports', { tab: 'sales' })} // Links to proper reports tab
      />
    </div>
  );
}
