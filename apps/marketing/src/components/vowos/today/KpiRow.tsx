import React, { useMemo } from 'react';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import { useVowosData } from '@/contexts/VowosDataContext';
import { useAppointments, useAppointmentRequestCount } from '@/lib/services/schedulingService';
import { StatTile } from '@/components/vowos/primitives/StatTile';
import { formatCents } from '@/data/vowosData';

interface KpiRowProps {
  businessId?: string;
  locationId: string | 'all';
}

/**
 * Four KPI tiles: Open Leads, Appointments Today, Requests Awaiting, Revenue MTD.
 * All values come from live data. No hard-coded numbers.
 */
export function KpiRow({ businessId, locationId }: KpiRowProps) {
  const { navigateToView } = useApplicationRoute();
  const { leads, invoices } = useVowosData();
  const { data: appointments = [], isLoading: apptLoading } = useAppointments(businessId, locationId);
  const { data: requestCount = 0, isLoading: reqLoading } = useAppointmentRequestCount(businessId, locationId, 'active');

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

  // Revenue MTD from invoices
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const revenueMtdCents = useMemo(() =>
    invoices.reduce((sum, inv) => {
      const d = new Date(inv.dueDate || Date.now());
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        return sum + (inv.paidCents || 0);
      }
      return sum;
    }, 0),
    [invoices, currentMonth, currentYear]
  );

  // 7-day sparkline data for leads (approximate from all leads, last 7 groups)
  const leadsSparkline = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, openLeads];
    // Fill partial history from leads created_at if available
    leads.forEach(l => {
      const d = new Date((l as any).createdAt || (l as any).created_at || Date.now());
      const daysAgo = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo >= 0 && daysAgo < 6) {
        counts[5 - daysAgo]++;
      }
    });
    counts[6] = openLeads; // today = total open
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatTile
        label="Open Leads"
        value={openLeads}
        sub={`${leads.length} total in pipeline`}
        sparklineData={leadsSparkline}
        onClick={() => navigateToView('growth', { tab: 'leads' })}
      />
      <StatTile
        label="Appointments Today"
        value={todayApptCount}
        sub={`${appointments.length} total on books`}
        sparklineData={apptSparkline}
        loading={apptLoading}
        onClick={() => navigateToView('appointments', { tab: 'calendar' })}
      />
      <StatTile
        label="Requests Awaiting"
        value={requestCount}
        sub="Booking requests pending"
        loading={reqLoading}
        onClick={() => navigateToView('appointments', { tab: 'booking-requests' })}
      />
      <StatTile
        label="Revenue MTD"
        value={formatCents(revenueMtdCents)}
        sub={`From ${invoices.filter(i => {
          const d = new Date(i.dueDate || Date.now());
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length} invoices`}
        onClick={() => navigateToView('sales', { tab: 'invoices' })}
      />
    </div>
  );
}
