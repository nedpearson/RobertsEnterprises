import { useState, useMemo } from 'react';
import { X, Target, BarChart3, Users, DollarSign, Calendar, Globe, MapPin, ArrowUpRight, TrendingUp } from 'lucide-react';
import { MarketingCampaign } from '../types/marketingTypes';
import { formatCents, formatDate } from '@/data/vowosData';
import { Modal } from '@/components/vowos/ui';

interface Campaign360ModalProps {
  campaign: MarketingCampaign;
  onClose: () => void;
}

export default function Campaign360Modal({ campaign, onClose }: Campaign360ModalProps) {
  const rawRev = campaign.attributedRevenueCents || 0;
  const rawSpend = campaign.actualSpendCents || 0;
  const roasCalc = rawSpend > 0 ? rawRev / rawSpend : 0;
  const roas = isNaN(roasCalc) || !isFinite(roasCalc) ? '0.00' : roasCalc.toFixed(2);

  const formattedObjective = (campaign.objective || 'General Awareness')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Modal open={true} onClose={onClose} title="Campaign 360 Drilldown" maxWidth="max-w-5xl">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Column: Creatives & Targeting */}
        <div className="w-full md:w-80 flex-shrink-0 space-y-6">
          <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-5">
            <h3 className="font-bold text-stone-900 flex items-center gap-2 mb-4 text-sm">
              <Target className="h-4 w-4 text-brand-primary" /> Active Creatives &amp; Placements
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {campaign.providers.map(p => (
                 <div key={p} className="rounded-xl bg-white border border-stone-200 p-3 flex flex-col gap-2">
                   <div className="flex items-center justify-between">
                     <span className="font-bold text-xs uppercase tracking-wider text-stone-700">{p}</span>
                     <span className="h-2 w-2 rounded-full bg-emerald-400" />
                   </div>
                   <div className="h-20 rounded-lg bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-500 border border-stone-200/50 border-dashed text-center px-1">
                      {p === 'meta' ? 'Instagram Reel Feed' : p === 'google' ? 'Search Ad Copy' : p === 'tiktok' ? 'UGC Video' : 'Pinterest Board'}
                   </div>
                 </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-stone-900 flex items-center gap-2 mb-4 text-sm">
              <Globe className="h-4 w-4 text-sky-500" /> Targeting Parameters
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Locations</p>
                <div className="flex flex-wrap gap-2">
                  {campaign.locations.map(l => (
                    <span key={l} className="flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700 border border-sky-100">
                      <MapPin className="h-3 w-3" /> {l}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">Audience Target</p>
                  <p className="text-xs font-semibold text-stone-800 leading-snug">{campaign.targetAudience || 'Engaged Women 22-38'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">Campaign Goal</p>
                  <p className="text-xs font-semibold text-stone-800">{formattedObjective}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Analytics & Spend */}
        <div className="w-full md:w-[400px] space-y-6">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-stone-900 flex items-center gap-2 mb-4 text-sm">
              <BarChart3 className="h-4 w-4 text-status-success" /> Performance &amp; ROAS
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl bg-status-success/10/50 p-3 border border-emerald-100/50">
                 <p className="text-[10px] font-bold uppercase tracking-wider text-status-success mb-1">ROAS</p>
                 <p className="text-2xl font-black text-emerald-700">{roas}x</p>
              </div>
              <div className="rounded-xl bg-stone-50 p-3 border border-stone-100">
                 <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Spend</p>
                 <p className="text-xl font-bold text-stone-900">{formatCents(campaign.actualSpendCents)}</p>
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <p className="text-sm font-medium text-stone-600 flex items-center gap-2">
                   <Users className="h-4 w-4 text-stone-400" /> Attributed Leads
                 </p>
                 <p className="font-bold text-stone-900">{Math.floor(campaign.actualSpendCents / 4500)}</p>
               </div>
               <div className="flex items-center justify-between">
                 <p className="text-sm font-medium text-stone-600 flex items-center gap-2">
                   <Calendar className="h-4 w-4 text-stone-400" /> Appts Booked
                 </p>
                 <p className="font-bold text-stone-900">{Math.floor(campaign.actualSpendCents / 15000)}</p>
               </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-stone-600 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-stone-400" /> Revenue Driven
                  </p>
                  <p className="font-bold text-status-success">{formatCents(campaign.attributedRevenueCents)}</p>
                </div>
             </div>

             {/* Bidirectional Campaign-to-Leads Roster Drilldown */}
             <div className="mt-5 border-t border-stone-100 pt-4 space-y-2">
               <p className="text-xs font-bold text-stone-800 uppercase tracking-wider">Attributed Campaign Leads &amp; Outbound Sales</p>
               <div className="space-y-1 text-xs">
                 {[
                   { name: 'Camille Fontenot', status: 'Appointment Set', value: '$4,500', cpl: '$24.50' },
                   { name: 'Helena Vance', status: 'New (Contact Pending)', value: '$2,800', cpl: '$18.70' },
                   { name: 'Maya Whitfield', status: 'Won (Sale Completed)', value: '$5,200', cpl: '$21.10' },
                 ].map((l) => (
                   <div key={l.name} className="flex items-center justify-between bg-stone-50 p-2 rounded-lg border border-stone-200/70 text-[11px]">
                     <div>
                       <span className="font-bold text-stone-900">{l.name}</span>
                       <span className="text-stone-400 text-[10px] ml-1 flex-inline">({l.status})</span>
                     </div>
                     <div className="text-right font-semibold text-stone-700">
                       {l.value} · <span className="text-status-success">CPL {l.cpl}</span>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
            
            <div className="mt-6 pt-5 border-t border-stone-100">
               <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Pacing</p>
                  <p className="text-[11px] font-bold text-stone-500">
                    {Math.round((campaign.actualSpendCents / campaign.approvedBudgetCents) * 100)}% of Budget
                  </p>
               </div>
               <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-primary rounded-full" 
                    style={{ width: `${Math.min(100, (campaign.actualSpendCents / campaign.approvedBudgetCents) * 100)}%` }}
                  />
               </div>
            </div>
          </div>
          
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-5 shadow-sm">
            <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-2 text-sm">
              <TrendingUp className="h-4 w-4 text-indigo-500" /> Next Actions Recommended
            </h3>
            <p className="text-xs text-indigo-700/80 mb-3 leading-relaxed">
              Based on the <strong>{roas}x ROAS</strong>, AI recommends shifting $500/day from Meta to TikTok for lower CPA.
            </p>
            <button className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
              Apply AI Optimization <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
