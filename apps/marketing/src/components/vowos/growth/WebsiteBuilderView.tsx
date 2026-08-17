import React, { useState } from 'react';
import { Globe, Smartphone, Monitor, Code, UploadCloud, Store, Link as LinkIcon, Settings, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';

export function WebsiteBuilderView() {
  const [activeTab, setActiveTab] = useState<'editor' | 'seo' | 'inventory'>('editor');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Website & SEO Command Center</h1>
          <p className="text-sm text-stone-400 mt-1">
            Manage your VowOS-hosted storefront, local inventory sync, and search visibility.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition-colors border border-white/10 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            View Live Site
          </button>
          <button className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-brand-primary/20 flex items-center gap-2">
            <UploadCloud className="w-4 h-4" />
            Publish Changes
          </button>
        </div>
      </div>

      <div className="flex border-b border-white/10">
        <button 
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'editor' ? 'border-brand-primary text-white' : 'border-transparent text-stone-400 hover:text-stone-300'}`}
        >
          Storefront Editor
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'inventory' ? 'border-brand-primary text-white' : 'border-transparent text-stone-400 hover:text-stone-300'}`}
        >
          Google Shopping Sync
        </button>
        <button 
          onClick={() => setActiveTab('seo')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'seo' ? 'border-brand-primary text-white' : 'border-transparent text-stone-400 hover:text-stone-300'}`}
        >
          Advanced SEO
        </button>
      </div>

      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-[#1c1a1f] border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Page Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-sm font-medium text-white">Header & Navigation</span>
                  <Settings className="w-4 h-4 text-stone-400 cursor-pointer hover:text-white transition-colors" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-brand-primary/10 border border-brand-primary/20">
                  <span className="text-sm font-medium text-brand-primary">Hero Section</span>
                  <Settings className="w-4 h-4 text-brand-primary cursor-pointer hover:text-brand-primary-hover transition-colors" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-sm font-medium text-white">Featured Designers</span>
                  <Settings className="w-4 h-4 text-stone-400 cursor-pointer hover:text-white transition-colors" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-sm font-medium text-white">Book Appointment</span>
                  <Settings className="w-4 h-4 text-stone-400 cursor-pointer hover:text-white transition-colors" />
                </div>
                <button className="w-full mt-4 flex items-center justify-center gap-2 py-2 border border-dashed border-white/20 rounded-lg text-sm text-stone-400 hover:text-white hover:border-white/40 transition-colors">
                  <Plus className="w-4 h-4" /> Add Section
                </button>
              </CardContent>
            </Card>

            <Card className="bg-[#1c1a1f] border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-primary" /> AI Copywriter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-stone-400 mb-3">Stuck on what to write? Let VowOS AI generate high-converting copy based on your brand voice.</p>
                <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium transition-colors border border-white/10">
                  Generate Hero Copy
                </button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="bg-[#1c1a1f] border-white/5 overflow-hidden h-[600px] flex flex-col">
              <div className="h-12 border-b border-white/10 bg-[#0c101a] flex items-center justify-between px-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
                  <button className="p-1 rounded bg-white/10 text-white"><Monitor className="w-4 h-4" /></button>
                  <button className="p-1 rounded text-stone-400 hover:text-white"><Smartphone className="w-4 h-4" /></button>
                </div>
                <div className="text-xs text-stone-500 flex items-center gap-1">
                  <Code className="w-3 h-3" /> Auto-saving...
                </div>
              </div>
              <div className="flex-1 bg-white relative flex items-center justify-center overflow-hidden rounded-b-xl">
                {/* Mock Live Preview Area */}
                <div className="absolute inset-0 bg-stone-100 flex flex-col">
                  <div className="h-16 bg-white border-b flex items-center justify-between px-8">
                    <div className="font-serif text-xl font-bold text-stone-900">The Modern Bride</div>
                    <div className="flex gap-6 text-sm font-medium text-stone-600">
                      <span>Designers</span>
                      <span>Dresses</span>
                      <span>Our Story</span>
                    </div>
                    <button className="px-4 py-2 bg-stone-900 text-white text-sm font-medium">Book Now</button>
                  </div>
                  <div className="flex-1 relative flex items-center justify-center bg-stone-200">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-stone-900/50" />
                    <div className="relative z-10 text-center space-y-4 p-8 ring-4 ring-brand-primary ring-opacity-50 rounded-xl bg-black/20 backdrop-blur-sm cursor-pointer hover:bg-black/30 transition-colors">
                      <h2 className="text-5xl font-serif font-bold text-white">Find Your Perfect Gown.</h2>
                      <p className="text-lg text-stone-200">Exclusive collections. Private styling suites. Unforgettable experiences.</p>
                      <button className="px-8 py-3 bg-white text-stone-900 font-bold mt-4">View Collections</button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="max-w-4xl space-y-6">
          <Card className="bg-[#1c1a1f] border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Store className="w-5 h-5 text-emerald-400" />
                Local Inventory Sync (Google Shopping)
              </CardTitle>
              <CardDescription>
                Automatically publish your in-stock gowns to Google Search so local brides can see exactly what you carry before booking an appointment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Sync is Active</h3>
                    <p className="text-sm text-stone-400">Last synced 14 minutes ago. 412 products indexed.</p>
                  </div>
                </div>
                <button className="px-4 py-2 border border-white/10 rounded-lg text-sm text-white hover:bg-white/5 transition-colors">
                  Force Sync Now
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-white">Visibility Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-white font-medium">Hide Discontinued Gowns</span>
                      <div className="w-8 h-5 bg-brand-primary rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                    <p className="text-xs text-stone-400">Automatically unpublish gowns marked as discontinued from your public catalog.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-white font-medium">Require Appointment to View Price</span>
                      <div className="w-8 h-5 bg-white/10 rounded-full relative cursor-pointer">
                        <div className="absolute left-1 top-1 w-3 h-3 bg-stone-400 rounded-full" />
                      </div>
                    </div>
                    <p className="text-xs text-stone-400">Hide prices on Google Shopping and your website. Displays "Call for Pricing".</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'seo' && (
        <div className="max-w-4xl space-y-6">
          <Card className="bg-[#1c1a1f] border-white/5">
            <CardHeader>
              <CardTitle>Global SEO Metadata</CardTitle>
              <CardDescription>Configure how your storefront appears in search engine results.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-300">Default Title Tag Format</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value="{{page_title}} | {{store_name}} | {{city}}, {{state}}"
                    readOnly
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none"
                  />
                  <button className="px-3 py-2 bg-white/10 rounded-lg text-sm text-white hover:bg-white/15">Edit</button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-300">Default Meta Description</label>
                <textarea 
                  rows={3}
                  defaultValue="Find your dream wedding dress at The Modern Bride in Chicago, IL. We carry exclusive designer collections in a luxury, private suite experience. Book your appointment today."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none outline-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1c1a1f] border-white/5">
            <CardHeader>
              <CardTitle>Technical SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                <div>
                  <h4 className="text-sm font-medium text-white">Auto-generate Sitemap.xml</h4>
                  <p className="text-xs text-stone-400">Keeps Google instantly updated when you add new designers or gowns.</p>
                </div>
                <div className="w-8 h-5 bg-brand-primary rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                <div>
                  <h4 className="text-sm font-medium text-white">Canonical URL Enforcement</h4>
                  <p className="text-xs text-stone-400">Prevents duplicate content penalties for filtered inventory pages.</p>
                </div>
                <div className="w-8 h-5 bg-brand-primary rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
