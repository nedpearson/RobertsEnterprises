import { useState } from 'react';
import { TrendingUp, Megaphone, DollarSign, Users, CalendarCheck, PauseCircle, AlertTriangle, PlayCircle, PlusCircle, CheckCircle2, ExternalLink, ShieldAlert, ShoppingBag, Sparkles } from 'lucide-react';
import { formatCents } from '@/data/vowosData';
import { getMarketingMetricsSummary, setEmergencyPauseStatus, getMarketingConnections } from '../api/marketingApi';
import { btnPrimary, btnSecondary } from '@/components/vowos/ui';
import { MarketTrendsWidget } from './MarketTrendsWidget';
import { toast } from '@vowos/design-system';

interface MarketingOverviewProps {
  brandFilter: string;
  locationFilter: string;
  onNavigateTab: (tab: string) => void;
  onOpenCampaignWizard: () => void;
}

export default function MarketingOverview({
  brandFilter,
  locationFilter,
  onNavigateTab,
  onOpenCampaignWizard,
}: MarketingOverviewProps) {
  const metrics = getMarketingMetricsSummary(brandFilter, locationFilter);
  const connections = getMarketingConnections();
  const [emergencyPaused, setEmergencyPaused] = useState(metrics.emergencyPauseActive);
  const [showPauseModal, setShowPauseModal] = useState(false);

  const handleToggleEmergencyPause = () => {
    const nextState = !emergencyPaused;
    setEmergencyPauseStatus(nextState);
    setEmergencyPaused(nextState);
    setShowPauseModal(false);
    toast({
      title: nextState ? '🚨 EMERGENCY PAUSE ACTIVATED' : 'PAID CAMPAIGN SPENDING RESUMED',
      description: nextState
        ? 'All active paid campaigns across Meta, Google, TikTok & Pinterest have been paused.'
        : 'Paid campaign delivery has been restored to normal operation.',
      variant: nextState ? 'destructive' : 'default',
    });
  };

  const connectedCount = connections.filter((c) => c.status === 'connected').length;

  return (
    <div className="space-y-6 select-none">
      {/* Emergency Pause Top Banner if Active */}
      {emergencyPaused && (
        <div className="rounded-2xl border-2 border-red-500 bg-red-500/10 p-4 text-red-900 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-red-600 flex-shrink-0 animate-pulse" />
              <div>
                <h4 className="font-bold text-red-900 text-sm">EMERGENCY PAUSE ACTIVE — ALL PAID SPENDING HALTED</h4>
                <p className="text-xs text-red-700">All paid advertising delivery across connected ad accounts is currently locked.</p>
              </div>
            </div>
            <button
              onClick={() => setShowPauseModal(true)}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition-colors"
            >
              Resume Paid Campaigns
            </button>
          </div>
        </div>
      )}

      {/* Hero Performance Header */}
      <div className="rounded-2xl bg-gradient-to-r from-stone-900 via-stone-800 to-rose-950 p-6 text-white shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-300 uppercase tracking-widest">
              <Sparkles className="h-4 w-4 text-brand-primary" /> The Boutique Marketing Command Center
            </div>
            <h2 className="text-2xl font-bold text-white mt-1">Cross-Platform Growth &amp; Attribution Hub</h2>
            <p className="text-xs text-stone-300 mt-1 max-w-xl">
              Centralized organic &amp; paid marketing operations across I Do Bridal Couture and Proper &amp; Co. boutiques.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowPauseModal(true)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm ${
                emergencyPaused
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {emergencyPaused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
              {emergencyPaused ? 'Resume Paid Campaigns' : 'PAUSE ALL PAID CAMPAIGNS'}
            </button>

            <button
              onClick={onOpenCampaignWizard}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-primary-hover transition-all"
            >
              <PlusCircle className="h-4 w-4" /> Build New Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Actionable Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Attributed Revenue & ROAS */}
        <div
          onClick={() => onNavigateTab('attribution')}
          className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Attributed Revenue</span>
            <TrendingUp className="h-4 w-4 text-brand-primary group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-2 text-2xl font-black text-stone-900">{formatCents(metrics.attributedRevenueCents)}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
              {metrics.roasMultiplier}x ROAS
            </span>
            <span className="text-stone-400">MER {metrics.marketingEfficiencyRatioPct}%</span>
          </div>
        </div>

        {/* Actual Spend & Pacing */}
        <div
          onClick={() => onNavigateTab('budget')}
          className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Ad Spend Pacing</span>
            <DollarSign className="h-4 w-4 text-status-warning group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-2 text-2xl font-black text-stone-900">{formatCents(metrics.actualSpendCents)}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-stone-500">Budget: {formatCents(metrics.totalApprovedBudgetCents)}</span>
            <span className="font-bold text-stone-700">{metrics.spendPacingPct}% Paced</span>
          </div>
        </div>

        {/* Leads & Cost Per Lead */}
        <div
          onClick={() => onNavigateTab('leads')}
          className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Ad Leads Generated</span>
            <Users className="h-4 w-4 text-sky-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-2 text-2xl font-black text-stone-900">{metrics.leadsGeneratedCount} Leads</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="rounded-full bg-sky-100 px-2 py-0.5 font-bold text-sky-800">
              CPL {formatCents(metrics.costPerLeadCents)}
            </span>
            <span className="text-stone-400">Meta &amp; Google Forms</span>
          </div>
        </div>

        {/* Appointments Booked & Cost */}
        <div
          onClick={() => onNavigateTab('attribution')}
          className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Attributed Bookings</span>
            <CalendarCheck className="h-4 w-4 text-violet-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-2 text-2xl font-black text-stone-900">{metrics.appointmentsBookedCount} Appointments</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="rounded-full bg-violet-100 px-2 py-0.5 font-bold text-violet-800">
              CPA {formatCents(metrics.costPerAppointmentCents)}
            </span>
            <span className="text-stone-400">Fitting Suites</span>
          </div>
        </div>
      </div>

      {/* Connections & Channel Health Bar */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-stone-900 text-sm">Provider Authorization &amp; Token Health</h3>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              {connectedCount} of {connections.length} Connected
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('connections')}
            className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover flex items-center gap-1"
          >
            Manage Connections <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {connections.map((c) => {
            const isConnected = c.status === 'connected';
            return (
              <div
                key={c.provider}
                onClick={() => onNavigateTab('connections')}
                className={`rounded-xl border p-3 cursor-pointer transition-all ${
                  isConnected ? 'border-stone-200 bg-stone-50/70 hover:border-brand-primary' : 'border-stone-200 bg-stone-100 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs capitalize text-stone-900">{c.provider}</span>
                  <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-status-success' : 'bg-stone-400'}`} />
                </div>
                <p className="mt-1 text-[11px] text-stone-500 truncate">
                  {isConnected ? c.externalBusinessName : 'Disconnected'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Market Trend Intelligence */}
      <MarketTrendsWidget />

      {/* Emergency Pause Confirmation Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-7 w-7 flex-shrink-0" />
              <h3 className="text-lg font-bold text-stone-900">
                {emergencyPaused ? 'Resume Paid Campaign Spending?' : 'PAUSE ALL PAID CAMPAIGNS?'}
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              {emergencyPaused
                ? 'This will resume active ad delivery across Meta, Google, TikTok, and Pinterest for The Boutique.'
                : 'This will immediately lock and pause all active paid campaigns across Meta, Google, TikTok, and Pinterest. No further ad spend will be incurred until resumed.'}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowPauseModal(false)} className={btnSecondary}>
                Cancel
              </button>
              <button
                onClick={handleToggleEmergencyPause}
                className={emergencyPaused ? btnPrimary : 'rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700'}
              >
                {emergencyPaused ? 'Yes, Resume Spending' : 'Yes, PAUSE ALL PAID CAMPAIGNS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
