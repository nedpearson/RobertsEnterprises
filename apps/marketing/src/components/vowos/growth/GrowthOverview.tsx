import React from 'react';
import { Megaphone, Target, DollarSign, TrendingUp, Search, Calendar, Users, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';

export function GrowthOverview() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Growth & Marketing Overview</h1>
          <p className="text-sm text-stone-400 mt-1">
            End-to-end attribution from first search click to final gown revenue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition-colors">
            Last 30 Days
          </button>
          <button className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-sm font-medium transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* AI Intelligence Panel */}
      <Card className="border-brand-primary/20 bg-brand-primary/5 shadow-lg shadow-brand-primary/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <CardContent className="p-6">
          <div className="flex gap-5">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-2xl flex items-center justify-center border border-brand-primary/30">
                <Sparkles className="w-6 h-6 text-brand-primary" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-bold text-white">AI Growth Recommendations</h3>
              <p className="text-stone-300 text-sm">
                VowOS has analyzed your search traffic, appointments, and local competitors over the last 7 days.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-2">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Local SEO</span>
                    <ArrowUpRight className="w-4 h-4 text-stone-500 group-hover:text-white" />
                  </div>
                  <h4 className="font-semibold text-white text-sm">Update Holiday Hours on Google</h4>
                  <p className="text-xs text-stone-400 mt-1">Labor Day is approaching. Boutiques that post accurate holiday hours see a 12% boost in weekend appointment requests.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Reputation</span>
                    <ArrowUpRight className="w-4 h-4 text-stone-500 group-hover:text-white" />
                  </div>
                  <h4 className="font-semibold text-white text-sm">Respond to 3 New 5-Star Reviews</h4>
                  <p className="text-xs text-stone-400 mt-1">You have 3 unanswered Google reviews. VowOS has pre-drafted replies. Click to review and publish.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1c1a1f] border-white/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Search className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-stone-400">Search Impressions</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl font-bold text-white">42.5k</h3>
                <span className="flex items-center text-xs font-medium text-emerald-400">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" /> 18%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1c1a1f] border-white/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-stone-400">New Leads</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl font-bold text-white">124</h3>
                <span className="flex items-center text-xs font-medium text-emerald-400">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" /> 8%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1c1a1f] border-white/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <Calendar className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-stone-400">Attributed Appointments</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl font-bold text-white">86</h3>
                <span className="flex items-center text-xs font-medium text-rose-400">
                  <ArrowDownRight className="w-3 h-3 mr-0.5" /> 2%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1c1a1f] border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          <CardContent className="p-5 flex items-center gap-4 relative">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-stone-400">Attributed Revenue</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl font-bold text-white">$48,250</h3>
                <span className="flex items-center text-xs font-medium text-emerald-400">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" /> 24%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attribution Funnel */}
      <Card className="bg-[#1c1a1f] border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-lg text-white">Traffic Source to Revenue Pipeline</CardTitle>
          <CardDescription>First-touch attribution linking external platforms to operational closed-won sales.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white/5 text-stone-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Source / Medium</th>
                  <th className="px-6 py-4 font-medium text-right">Leads</th>
                  <th className="px-6 py-4 font-medium text-right">Appointments</th>
                  <th className="px-6 py-4 font-medium text-right">Conversion %</th>
                  <th className="px-6 py-4 font-medium text-right">Closed Sales</th>
                  <th className="px-6 py-4 font-medium text-right text-emerald-400">Generated Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-stone-300">
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <Search className="w-4 h-4 text-blue-400" />
                    </div>
                    Google Organic
                  </td>
                  <td className="px-6 py-4 text-right">64</td>
                  <td className="px-6 py-4 text-right">48</td>
                  <td className="px-6 py-4 text-right">75%</td>
                  <td className="px-6 py-4 text-right">32</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-400">$34,500</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <Target className="w-4 h-4 text-rose-400" />
                    </div>
                    Instagram Ads (Retargeting)
                  </td>
                  <td className="px-6 py-4 text-right">38</td>
                  <td className="px-6 py-4 text-right">24</td>
                  <td className="px-6 py-4 text-right">63%</td>
                  <td className="px-6 py-4 text-right">8</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-400">$8,250</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <Megaphone className="w-4 h-4 text-amber-400" />
                    </div>
                    Google Ads (Local)
                  </td>
                  <td className="px-6 py-4 text-right">22</td>
                  <td className="px-6 py-4 text-right">14</td>
                  <td className="px-6 py-4 text-right">63%</td>
                  <td className="px-6 py-4 text-right">5</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-400">$5,500</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
