import React, { useState } from 'react';
import { MapPin, CheckCircle2, AlertTriangle, Building2, Store, TrendingUp, TrendingDown, Minus, Target, Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';
import { useDemo } from '@/lib/demo/demoContext';

export function LocalSeoCommandCenter() {
  const { isDemoMode } = useDemo();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState('14 minutes ago');

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSynced('Just now');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Local SEO & Google Business</h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage your physical locations across Google Maps and Local Search.
          </p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
        >
          {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          {isSyncing ? 'Syncing...' : 'Sync with Google'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="border-b border-stone-100 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-stone-900">Connected Locations</CardTitle>
                <CardDescription>Google Business Profiles mapped to your VowOS organization.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-stone-100">
                <div className="p-5 flex items-center justify-between hover:bg-stone-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/5 flex items-center justify-center border border-brand-primary/20">
                      <Store className="w-5 h-5 text-brand-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-stone-900 flex items-center gap-2">
                        Magnolia Bridal Couture - Main
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">VERIFIED</span>
                      </h4>
                      <p className="text-sm text-stone-500 mt-0.5">123 Market St, San Francisco, CA</p>
                      <p className="text-xs text-stone-400 mt-0.5">Last synced: {lastSynced}</p>
                    </div>
                  </div>
                  <button className="text-sm text-brand-primary font-medium hover:text-brand-primary-hover px-3 py-1.5 rounded bg-brand-primary/5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Manage Profile
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="border-b border-stone-100 pb-4">
              <CardTitle className="text-lg text-stone-900">Profile Health Warnings</CardTitle>
              <CardDescription>Issues preventing your locations from ranking higher in local search.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <h5 className="font-semibold text-amber-900">Missing Holiday Hours</h5>
                  <p className="text-sm text-amber-700 mt-1">Labor Day is approaching. Adding holiday hours prevents Google from showing a "Hours might differ" warning to searchers.</p>
                  <button className="mt-3 text-xs font-semibold bg-white border border-amber-200 hover:bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                    Add Holiday Hours
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="border-b border-stone-100 pb-4">
              <CardTitle className="text-lg text-stone-900">Google Maps Analytics</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-600">Profile Views</span>
                  <span className="text-stone-900 font-medium">1,240</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2">
                  <div className="bg-brand-primary h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-600">Direction Requests</span>
                  <span className="text-stone-900 font-medium">342</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-600">Website Clicks</span>
                  <span className="text-stone-900 font-medium">488</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="border-b border-stone-100 pb-4">
              <CardTitle className="text-lg text-stone-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-primary" />
                Local Rank Tracker
              </CardTitle>
              <CardDescription>Your position in the Google Maps "Local Pack" for key terms.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isDemoMode ? (
                <div className="divide-y divide-stone-100">
                  <div className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                    <div>
                      <h5 className="text-sm font-medium text-stone-900">"bridal shops near me"</h5>
                      <p className="text-xs text-stone-500">12,400 local searches/mo</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-stone-900">#1</span>
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                    <div>
                      <h5 className="text-sm font-medium text-stone-900">"wedding dresses chicago"</h5>
                      <p className="text-xs text-stone-500">8,100 local searches/mo</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-stone-900">#2</span>
                      <Minus className="w-4 h-4 text-stone-300" />
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                    <div>
                      <h5 className="text-sm font-medium text-stone-900">"plus size wedding dress"</h5>
                      <p className="text-xs text-stone-500">4,200 local searches/mo</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-stone-600">#4</span>
                      <TrendingDown className="w-4 h-4 text-rose-500" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-50 border border-stone-100 text-stone-400">
                    <Target className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-stone-900">Rank Tracker Setup Required</h3>
                  <p className="mt-1 text-xs text-stone-500">
                    Configure your target keywords and Google Business Profile to begin tracking local map positions.
                  </p>
                  <button className="mt-4 rounded-lg bg-white border border-stone-200 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors">
                    Configure Tracker
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
