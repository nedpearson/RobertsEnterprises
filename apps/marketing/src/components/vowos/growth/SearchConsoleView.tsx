import React from 'react';
import { Search, TrendingUp, BarChart, ExternalLink, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';

export function SearchConsoleView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Search Console & SEO</h1>
          <p className="text-sm text-stone-400 mt-1">
            Monitor the exact queries driving brides to your website and your site's technical health.
          </p>
        </div>
        <button className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          <Search className="w-4 h-4" /> Connect GSC
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-[#1c1a1f] border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-lg text-white">Top Search Queries</CardTitle>
              <CardDescription>What brides are searching before clicking on your site.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white/5 text-stone-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-medium">Search Query</th>
                      <th className="px-6 py-4 font-medium text-right">Impressions</th>
                      <th className="px-6 py-4 font-medium text-right">Clicks</th>
                      <th className="px-6 py-4 font-medium text-right">CTR</th>
                      <th className="px-6 py-4 font-medium text-right">Avg. Pos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-stone-300">
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">wedding dresses near me</td>
                      <td className="px-6 py-4 text-right">12,450</td>
                      <td className="px-6 py-4 text-right">1,240</td>
                      <td className="px-6 py-4 text-right">10.0%</td>
                      <td className="px-6 py-4 text-right text-emerald-400">2.4</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">magnolia bridal couture</td>
                      <td className="px-6 py-4 text-right">3,200</td>
                      <td className="px-6 py-4 text-right">1,850</td>
                      <td className="px-6 py-4 text-right">57.8%</td>
                      <td className="px-6 py-4 text-right text-emerald-400">1.1</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                        maggie sottero dresses baton rouge
                        <span className="inline-flex items-center rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-bold text-brand-primary border border-brand-primary/20">HIGH INTENT</span>
                      </td>
                      <td className="px-6 py-4 text-right">840</td>
                      <td className="px-6 py-4 text-right">120</td>
                      <td className="px-6 py-4 text-right text-amber-400">14.3%</td>
                      <td className="px-6 py-4 text-right text-amber-400">5.2</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-[#1c1a1f] border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-lg text-white">Technical SEO Health</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div>
                  <p className="text-3xl font-bold text-emerald-400">92</p>
                  <p className="text-xs text-stone-400 uppercase tracking-wider font-bold">Health Score</p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">Core Web Vitals</span>
                  <span className="text-emerald-400 font-medium">Pass</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">Structured Data</span>
                  <span className="text-emerald-400 font-medium">Valid</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">Broken Links (404)</span>
                  <span className="text-amber-400 font-medium">3 found</span>
                </div>
              </div>
              <button className="w-full mt-4 py-2 bg-white/5 hover:bg-white/10 text-stone-300 rounded-lg text-xs font-semibold transition-colors">
                Run Full Audit
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
