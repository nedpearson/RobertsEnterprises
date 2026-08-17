import React, { useState } from 'react';
import { Target, Search, Megaphone, CheckCircle2, ChevronRight, TrendingUp, Filter, Calendar, Users, DollarSign, MousePointerClick } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';

export function AttributionView() {
  const [timeframe, setTimeframe] = useState('Last 30 Days');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Marketing Attribution</h1>
          <p className="text-sm text-stone-400 mt-1">
            Deep dive into which channels, campaigns, and keywords generate the most revenue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-[#1c1a1f] border border-white/10 text-white rounded-lg text-sm font-medium transition-colors hover:bg-white/5 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-400" />
            {timeframe}
          </button>
          <button className="px-4 py-2 bg-[#1c1a1f] border border-white/10 text-white rounded-lg text-sm font-medium transition-colors hover:bg-white/5 flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-400" />
            All Channels
          </button>
        </div>
      </div>
      
      {/* Funnel Visualizer */}
      <Card className="bg-[#1c1a1f] border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-[#0c101a]/50">
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Track the journey from initial discovery to final gown sale.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-white/5">
            
            {/* Step 1 */}
            <div className="p-6 relative group hover:bg-white/5 transition-colors cursor-default">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Search className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-sm font-medium text-stone-400">1. Discovery</div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">142k</h3>
              <p className="text-xs text-stone-500 mb-4">Total Impressions</p>
              
              <div className="space-y-2 mt-auto">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Google Search</span>
                  <span className="text-white font-medium">84k</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Instagram</span>
                  <span className="text-white font-medium">42k</span>
                </div>
              </div>
              
              <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-6 h-6 rounded-full bg-[#1c1a1f] border border-white/10 flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-stone-500" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 relative group hover:bg-white/5 transition-colors cursor-default">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <MousePointerClick className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-sm font-medium text-stone-400">2. Clicks</div>
              </div>
              <div className="flex items-end gap-3 mb-1">
                <h3 className="text-3xl font-bold text-white">4.2k</h3>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 mb-1">3.0% CTR</span>
              </div>
              <p className="text-xs text-stone-500 mb-4">Site Visitors</p>
              
              <div className="space-y-2 mt-auto">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Cost per Click</span>
                  <span className="text-white font-medium">$1.12</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Bounce Rate</span>
                  <span className="text-white font-medium">41%</span>
                </div>
              </div>
              
              <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-6 h-6 rounded-full bg-[#1c1a1f] border border-white/10 flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-stone-500" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 relative group hover:bg-white/5 transition-colors cursor-default">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-sm font-medium text-stone-400">3. Leads</div>
              </div>
              <div className="flex items-end gap-3 mb-1">
                <h3 className="text-3xl font-bold text-white">215</h3>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 mb-1">5.1% Conv</span>
              </div>
              <p className="text-xs text-stone-500 mb-4">Inquiries & Signups</p>
              
              <div className="space-y-2 mt-auto">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Cost per Lead</span>
                  <span className="text-white font-medium">$21.86</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Time to Contact</span>
                  <span className="text-white font-medium">14m</span>
                </div>
              </div>
              
              <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-6 h-6 rounded-full bg-[#1c1a1f] border border-white/10 flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-stone-500" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-6 relative group hover:bg-white/5 transition-colors cursor-default">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <Target className="w-5 h-5 text-rose-400" />
                </div>
                <div className="text-sm font-medium text-stone-400">4. Bookings</div>
              </div>
              <div className="flex items-end gap-3 mb-1">
                <h3 className="text-3xl font-bold text-white">86</h3>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 mb-1">40.0% Rate</span>
              </div>
              <p className="text-xs text-stone-500 mb-4">Appointments Booked</p>
              
              <div className="space-y-2 mt-auto">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Show Rate</span>
                  <span className="text-white font-medium">88%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Cost per Appt</span>
                  <span className="text-white font-medium">$54.65</span>
                </div>
              </div>
              
              <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-6 h-6 rounded-full bg-[#1c1a1f] border border-white/10 flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-stone-500" />
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-6 relative group hover:bg-brand-primary/5 transition-colors cursor-default">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-sm font-medium text-brand-primary">5. Revenue</div>
              </div>
              <div className="flex items-end gap-3 mb-1">
                <h3 className="text-3xl font-bold text-white">52</h3>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 mb-1">60.4% Close</span>
              </div>
              <p className="text-xs text-brand-primary mb-4">Gowns Sold</p>
              
              <div className="space-y-2 mt-auto pt-4 border-t border-brand-primary/20">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-white">Revenue</span>
                  <span className="text-emerald-400">$109,200</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">ROAS</span>
                  <span className="text-white font-medium">23x</span>
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-[#1c1a1f] border-white/5">
          <CardHeader>
            <CardTitle>Channel Performance & ROI</CardTitle>
            <CardDescription>Compare actual revenue generated by each marketing source.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    <th className="pb-3 px-2">Channel</th>
                    <th className="pb-3 px-2 text-right">Spend</th>
                    <th className="pb-3 px-2 text-right">Leads</th>
                    <th className="pb-3 px-2 text-right">CAC</th>
                    <th className="pb-3 px-2 text-right">Sales</th>
                    <th className="pb-3 px-2 text-right text-emerald-400">Revenue</th>
                    <th className="pb-3 px-2 text-right text-emerald-400">ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-2 font-medium text-white flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Google Organic (SEO)
                    </td>
                    <td className="py-4 px-2 text-right text-stone-300">$0</td>
                    <td className="py-4 px-2 text-right text-stone-300">86</td>
                    <td className="py-4 px-2 text-right text-stone-300">$0.00</td>
                    <td className="py-4 px-2 text-right text-white">24</td>
                    <td className="py-4 px-2 text-right text-emerald-400 font-medium">$50,400</td>
                    <td className="py-4 px-2 text-right text-stone-300">∞</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-2 font-medium text-white flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      Google Ads (PPC)
                    </td>
                    <td className="py-4 px-2 text-right text-stone-300">$2,400</td>
                    <td className="py-4 px-2 text-right text-stone-300">62</td>
                    <td className="py-4 px-2 text-right text-stone-300">$171.42</td>
                    <td className="py-4 px-2 text-right text-white">14</td>
                    <td className="py-4 px-2 text-right text-emerald-400 font-medium">$29,400</td>
                    <td className="py-4 px-2 text-right text-stone-300">12.2x</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-2 font-medium text-white flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      Instagram Ads
                    </td>
                    <td className="py-4 px-2 text-right text-stone-300">$1,800</td>
                    <td className="py-4 px-2 text-right text-stone-300">45</td>
                    <td className="py-4 px-2 text-right text-stone-300">$200.00</td>
                    <td className="py-4 px-2 text-right text-white">9</td>
                    <td className="py-4 px-2 text-right text-emerald-400 font-medium">$18,900</td>
                    <td className="py-4 px-2 text-right text-stone-300">10.5x</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-2 font-medium text-white flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      Referrals / Word of Mouth
                    </td>
                    <td className="py-4 px-2 text-right text-stone-300">$0</td>
                    <td className="py-4 px-2 text-right text-stone-300">22</td>
                    <td className="py-4 px-2 text-right text-stone-300">$0.00</td>
                    <td className="py-4 px-2 text-right text-white">5</td>
                    <td className="py-4 px-2 text-right text-emerald-400 font-medium">$10,500</td>
                    <td className="py-4 px-2 text-right text-stone-300">∞</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-brand-primary/10 border-brand-primary/20">
            <CardHeader>
              <CardTitle className="text-brand-primary flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Highest Converting Keywords
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">"bridal shops near me"</span>
                  <span className="text-sm font-medium text-emerald-400">$21k</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">"maggie sottero chicago"</span>
                  <span className="text-sm font-medium text-emerald-400">$14.5k</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">"plus size wedding dresses"</span>
                  <span className="text-sm font-medium text-emerald-400">$8.2k</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1c1a1f] border-white/5">
            <CardHeader>
              <CardTitle>Customer Acquisition Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 mb-4">
                <h3 className="text-4xl font-bold text-white">$80.76</h3>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 mb-1">
                  -12% vs last month
                </span>
              </div>
              <p className="text-sm text-stone-400">
                It costs you exactly $80.76 in ad spend to generate a $2,100 average gown sale.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
