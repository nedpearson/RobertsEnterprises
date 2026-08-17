import React, { useState } from 'react';
import { Target, Search, Megaphone, CheckCircle2, ChevronRight, TrendingUp, Filter, Calendar, Users, DollarSign, MousePointerClick } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';

export function AttributionView() {
  const [timeframe, setTimeframe] = useState('Last 30 Days');
  const [filter, setFilter] = useState('All Channels');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Marketing Attribution</h1>
          <p className="text-sm text-stone-500 mt-1">
            Deep dive into which channels, campaigns, and keywords generate the most revenue.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select 
            className="px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm font-medium transition-colors hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Quarter</option>
          </select>
          <select 
            className="px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm font-medium transition-colors hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All Channels</option>
            <option>Organic Search</option>
            <option>Paid Search</option>
            <option>Social Media</option>
          </select>
        </div>
      </div>
      
      {/* Funnel Visualizer */}
      <Card className="bg-white border-stone-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-stone-100 bg-stone-50/50">
          <CardTitle className="text-lg text-stone-900">Conversion Funnel</CardTitle>
          <CardDescription>Track the journey from initial discovery to final gown sale.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-stone-100">
            
            {/* Step 1 */}
            <div className="p-6 relative group hover:bg-stone-50 transition-colors cursor-default">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-sm font-medium text-stone-600">1. Discovery</div>
              </div>
              <h3 className="text-3xl font-bold text-stone-900 mb-1">142k</h3>
              <p className="text-xs text-stone-500 mb-4">Total Impressions</p>
              
              <div className="space-y-2 mt-auto">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Google Search</span>
                  <span className="text-stone-900 font-medium">84k</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Instagram</span>
                  <span className="text-stone-900 font-medium">42k</span>
                </div>
              </div>
              
              <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-6 h-6 rounded-full bg-white border border-stone-200 shadow-sm flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 relative group hover:bg-stone-50 transition-colors cursor-default">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                  <MousePointerClick className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-sm font-medium text-stone-600">2. Clicks</div>
              </div>
              <div className="flex items-end gap-3 mb-1">
                <h3 className="text-3xl font-bold text-stone-900">4.2k</h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mb-1">3.0% CTR</span>
              </div>
              <p className="text-xs text-stone-500 mb-4">Site Visitors</p>
              
              <div className="space-y-2 mt-auto">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Cost per Click</span>
                  <span className="text-stone-900 font-medium">$1.12</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Bounce Rate</span>
                  <span className="text-stone-900 font-medium">41%</span>
                </div>
              </div>
              
              <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-6 h-6 rounded-full bg-white border border-stone-200 shadow-sm flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 relative group hover:bg-stone-50 transition-colors cursor-default">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-sm font-medium text-stone-600">3. Leads</div>
              </div>
              <div className="flex items-end gap-3 mb-1">
                <h3 className="text-3xl font-bold text-stone-900">215</h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mb-1">5.1% Conv</span>
              </div>
              <p className="text-xs text-stone-500 mb-4">Inquiries & Signups</p>
              
              <div className="space-y-2 mt-auto">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Cost per Lead</span>
                  <span className="text-stone-900 font-medium">$21.86</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Time to Contact</span>
                  <span className="text-stone-900 font-medium">14m</span>
                </div>
              </div>
              
              <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-6 h-6 rounded-full bg-white border border-stone-200 shadow-sm flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-6 relative group hover:bg-stone-50 transition-colors cursor-default">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
                  <Target className="w-5 h-5 text-rose-600" />
                </div>
                <div className="text-sm font-medium text-stone-600">4. Bookings</div>
              </div>
              <div className="flex items-end gap-3 mb-1">
                <h3 className="text-3xl font-bold text-stone-900">86</h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mb-1">40.0% Rate</span>
              </div>
              <p className="text-xs text-stone-500 mb-4">Appointments Booked</p>
              
              <div className="space-y-2 mt-auto">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Show Rate</span>
                  <span className="text-stone-900 font-medium">88%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Cost per Appt</span>
                  <span className="text-stone-900 font-medium">$54.65</span>
                </div>
              </div>
              
              <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-6 h-6 rounded-full bg-white border border-stone-200 shadow-sm flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-6 relative group hover:bg-brand-soft/20 transition-colors cursor-default">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-sm font-bold text-brand-primary">5. Revenue</div>
              </div>
              <div className="flex items-end gap-3 mb-1">
                <h3 className="text-3xl font-bold text-stone-900">52</h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mb-1">60.4% Close</span>
              </div>
              <p className="text-xs text-stone-500 font-medium mb-4">Gowns Sold</p>
              
              <div className="space-y-2 mt-auto pt-4 border-t border-brand-primary/20">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-stone-900">Revenue</span>
                  <span className="text-emerald-600">$109,200</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">ROAS</span>
                  <span className="text-stone-900 font-medium">23x</span>
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white border-stone-200 shadow-sm">
          <CardHeader className="border-b border-stone-100 pb-4">
            <CardTitle className="text-lg text-stone-900">Channel Performance & ROI</CardTitle>
            <CardDescription>Compare actual revenue generated by each marketing source.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                  <tr className="border-b border-stone-200">
                    <th className="py-3 px-4 font-medium">Channel</th>
                    <th className="py-3 px-4 font-medium text-right">Spend</th>
                    <th className="py-3 px-4 font-medium text-right">Leads</th>
                    <th className="py-3 px-4 font-medium text-right">CAC</th>
                    <th className="py-3 px-4 font-medium text-right">Sales</th>
                    <th className="py-3 px-4 font-medium text-right text-emerald-700">Revenue</th>
                    <th className="py-3 px-4 font-medium text-right text-emerald-700">ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr className="hover:bg-stone-50 transition-colors">
                    <td className="py-4 px-4 font-medium text-stone-900 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Google Organic (SEO)
                    </td>
                    <td className="py-4 px-4 text-right text-stone-600">$0</td>
                    <td className="py-4 px-4 text-right text-stone-600">86</td>
                    <td className="py-4 px-4 text-right text-stone-600">$0.00</td>
                    <td className="py-4 px-4 text-right text-stone-900 font-medium">24</td>
                    <td className="py-4 px-4 text-right text-emerald-600 font-bold">$50,400</td>
                    <td className="py-4 px-4 text-right text-stone-600">∞</td>
                  </tr>
                  <tr className="hover:bg-stone-50 transition-colors">
                    <td className="py-4 px-4 font-medium text-stone-900 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      Google Ads (PPC)
                    </td>
                    <td className="py-4 px-4 text-right text-stone-600">$2,400</td>
                    <td className="py-4 px-4 text-right text-stone-600">62</td>
                    <td className="py-4 px-4 text-right text-stone-600">$171.42</td>
                    <td className="py-4 px-4 text-right text-stone-900 font-medium">14</td>
                    <td className="py-4 px-4 text-right text-emerald-600 font-bold">$29,400</td>
                    <td className="py-4 px-4 text-right text-stone-600 font-medium">12.2x</td>
                  </tr>
                  <tr className="hover:bg-stone-50 transition-colors">
                    <td className="py-4 px-4 font-medium text-stone-900 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      Instagram Ads
                    </td>
                    <td className="py-4 px-4 text-right text-stone-600">$1,800</td>
                    <td className="py-4 px-4 text-right text-stone-600">45</td>
                    <td className="py-4 px-4 text-right text-stone-600">$200.00</td>
                    <td className="py-4 px-4 text-right text-stone-900 font-medium">9</td>
                    <td className="py-4 px-4 text-right text-emerald-600 font-bold">$18,900</td>
                    <td className="py-4 px-4 text-right text-stone-600 font-medium">10.5x</td>
                  </tr>
                  <tr className="hover:bg-stone-50 transition-colors">
                    <td className="py-4 px-4 font-medium text-stone-900 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      Referrals / Word of Mouth
                    </td>
                    <td className="py-4 px-4 text-right text-stone-600">$0</td>
                    <td className="py-4 px-4 text-right text-stone-600">22</td>
                    <td className="py-4 px-4 text-right text-stone-600">$0.00</td>
                    <td className="py-4 px-4 text-right text-stone-900 font-medium">5</td>
                    <td className="py-4 px-4 text-right text-emerald-600 font-bold">$10,500</td>
                    <td className="py-4 px-4 text-right text-stone-600">∞</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-brand-soft/30 border-brand-primary/20 shadow-sm">
            <CardHeader className="border-b border-brand-primary/10 pb-4">
              <CardTitle className="text-brand-primary flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5" /> Highest Converting Keywords
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-800">"bridal shops near me"</span>
                  <span className="text-sm font-bold text-emerald-600">$21k</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-800">"maggie sottero chicago"</span>
                  <span className="text-sm font-bold text-emerald-600">$14.5k</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-800">"plus size wedding dresses"</span>
                  <span className="text-sm font-bold text-emerald-600">$8.2k</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="border-b border-stone-100 pb-4">
              <CardTitle className="text-lg text-stone-900">Customer Acquisition Cost</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-end gap-3 mb-4">
                <h3 className="text-4xl font-bold text-stone-900">$80.76</h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 mb-1">
                  -12% vs last month
                </span>
              </div>
              <p className="text-sm text-stone-600">
                It costs you exactly $80.76 in ad spend to generate a $2,100 average gown sale.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
