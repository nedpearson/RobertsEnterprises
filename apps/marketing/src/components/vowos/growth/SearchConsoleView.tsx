import React, { useState } from 'react';
import { Search, TrendingUp, BarChart, ExternalLink, ShieldAlert, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';

export function SearchConsoleView() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);

  const runAudit = () => {
    setIsAuditing(true);
    setAuditComplete(false);
    setTimeout(() => {
      setIsAuditing(false);
      setAuditComplete(true);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Search Console & SEO</h1>
          <p className="text-sm text-stone-500 mt-1">
            Monitor the exact queries driving brides to your website and your site's technical health.
          </p>
        </div>
        <button className="px-4 py-2 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          <Search className="w-4 h-4" /> Connect GSC
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="border-b border-stone-100 pb-4">
              <CardTitle className="text-lg text-stone-900">Top Search Queries</CardTitle>
              <CardDescription>What brides are searching before clicking on your site.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider border-b border-stone-200">
                    <tr>
                      <th className="px-6 py-4 font-medium">Search Query</th>
                      <th className="px-6 py-4 font-medium text-right">Impressions</th>
                      <th className="px-6 py-4 font-medium text-right">Clicks</th>
                      <th className="px-6 py-4 font-medium text-right">CTR</th>
                      <th className="px-6 py-4 font-medium text-right">Avg. Pos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-600">
                    <tr className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-stone-900">wedding dresses near me</td>
                      <td className="px-6 py-4 text-right">12,450</td>
                      <td className="px-6 py-4 text-right">1,240</td>
                      <td className="px-6 py-4 text-right">10.0%</td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-medium">2.4</td>
                    </tr>
                    <tr className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-stone-900">magnolia bridal couture</td>
                      <td className="px-6 py-4 text-right">3,200</td>
                      <td className="px-6 py-4 text-right">1,850</td>
                      <td className="px-6 py-4 text-right">57.8%</td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-medium">1.1</td>
                    </tr>
                    <tr className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-stone-900 flex items-center gap-2">
                        maggie sottero dresses baton rouge
                        <span className="inline-flex items-center rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-bold text-brand-primary border border-brand-primary/20">HIGH INTENT</span>
                      </td>
                      <td className="px-6 py-4 text-right">840</td>
                      <td className="px-6 py-4 text-right">120</td>
                      <td className="px-6 py-4 text-right text-amber-600 font-medium">14.3%</td>
                      <td className="px-6 py-4 text-right text-amber-600 font-medium">5.2</td>
                    </tr>
                    <tr className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-stone-900">bridal shops in louisiana</td>
                      <td className="px-6 py-4 text-right">650</td>
                      <td className="px-6 py-4 text-right">45</td>
                      <td className="px-6 py-4 text-right">6.9%</td>
                      <td className="px-6 py-4 text-right text-amber-600 font-medium">8.4</td>
                    </tr>
                    <tr className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-stone-900">plus size wedding dresses</td>
                      <td className="px-6 py-4 text-right">420</td>
                      <td className="px-6 py-4 text-right">18</td>
                      <td className="px-6 py-4 text-right">4.2%</td>
                      <td className="px-6 py-4 text-right text-rose-500 font-medium">14.7</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="border-b border-stone-100 pb-4">
              <CardTitle className="text-lg text-stone-900">Technical SEO Health</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div>
                  <p className="text-3xl font-bold text-emerald-600">92</p>
                  <p className="text-xs text-stone-500 uppercase tracking-wider font-bold">Health Score</p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-emerald-100 bg-emerald-50 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-emerald-600" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600">Core Web Vitals</span>
                  <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Pass</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600">Structured Data</span>
                  <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Valid</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600">Broken Links (404)</span>
                  <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100">3 found</span>
                </div>
              </div>
              
              <button 
                onClick={runAudit}
                disabled={isAuditing}
                className="w-full mt-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isAuditing ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Auditing Site...</>
                ) : auditComplete ? (
                  <><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Audit Complete</>
                ) : (
                  <><RefreshCw className="w-3 h-3" /> Run Full Audit</>
                )}
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
