import React, { useState } from 'react';
import { Globe, Smartphone, Monitor, Code, UploadCloud, Store, Link as LinkIcon, Settings, Plus, Sparkles, CheckCircle2, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';
import { useDemo } from '@/lib/demo/demoContext';

export function WebsiteBuilderView() {
  const { isDemoMode } = useDemo();
  const [activeTab, setActiveTab] = useState<'editor' | 'inventory' | 'seo'>('editor');
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setPublished(true);
      setTimeout(() => setPublished(false), 3000);
    }, 2000);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Website & SEO Command Center</h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage your VowOS-hosted storefront, local inventory sync, and search visibility.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="px-4 py-2 bg-white hover:bg-stone-50 text-stone-700 rounded-lg text-sm font-medium transition-colors border border-stone-200 shadow-sm flex items-center gap-2">
            <Globe className="w-4 h-4" />
            View Live Site
          </button>
          <button 
            onClick={handlePublish}
            disabled={isPublishing || published}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm ${
              published ? 'bg-emerald-600' : 'bg-brand-primary hover:bg-brand-primary-hover shadow-brand-primary/20'
            } disabled:opacity-80`}
          >
            {isPublishing ? (
              <><UploadCloud className="w-4 h-4 animate-bounce" /> Publishing...</>
            ) : published ? (
              <><CheckCircle2 className="w-4 h-4" /> Published</>
            ) : (
              <><UploadCloud className="w-4 h-4" /> Publish Changes</>
            )}
          </button>
        </div>
      </div>

      <div className="flex border-b border-stone-200">
        <button 
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'editor' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
        >
          Storefront Editor
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'inventory' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
        >
          Google Shopping Sync
        </button>
        <button 
          onClick={() => setActiveTab('seo')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'seo' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
        >
          Advanced SEO
        </button>
      </div>

      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-white border-stone-200 shadow-sm">
              <CardHeader className="border-b border-stone-100 pb-4">
                <CardTitle className="text-sm text-stone-900">Page Structure</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-sm font-medium text-stone-700">Header & Navigation</span>
                  <Settings className="w-4 h-4 text-stone-400 cursor-pointer hover:text-stone-600 transition-colors" />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-brand-soft/30 border border-brand-primary/20 shadow-sm">
                  <span className="text-sm font-bold text-brand-primary">Hero Section</span>
                  <Settings className="w-4 h-4 text-brand-primary cursor-pointer transition-colors" />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-sm font-medium text-stone-700">Featured Designers</span>
                  <Settings className="w-4 h-4 text-stone-400 cursor-pointer hover:text-stone-600 transition-colors" />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-sm font-medium text-stone-700">Book Appointment</span>
                  <Settings className="w-4 h-4 text-stone-400 cursor-pointer hover:text-stone-600 transition-colors" />
                </div>
                <button className="w-full mt-4 flex items-center justify-center gap-2 py-2 border border-dashed border-stone-300 rounded-lg text-sm font-medium text-stone-500 hover:text-stone-700 hover:border-stone-400 transition-colors bg-white hover:bg-stone-50">
                  <Plus className="w-4 h-4" /> Add Section
                </button>
              </CardContent>
            </Card>

            <Card className="bg-white border-stone-200 shadow-sm">
              <CardHeader className="border-b border-stone-100 pb-4">
                <CardTitle className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-primary" /> AI Copywriter
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-xs text-stone-500 mb-3 leading-relaxed">Stuck on what to write? Let VowOS AI generate high-converting copy based on your brand voice.</p>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {isGenerating ? 'Generating...' : 'Generate Hero Copy'}
                </button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="bg-white border-stone-200 shadow-sm overflow-hidden h-[600px] flex flex-col">
              <div className="h-12 border-b border-stone-200 bg-stone-50 flex items-center justify-between px-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-stone-200 shadow-sm">
                  <button className="p-1.5 rounded bg-stone-100 text-stone-800"><Monitor className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded text-stone-400 hover:text-stone-600"><Smartphone className="w-4 h-4" /></button>
                </div>
                <div className="text-xs font-medium text-stone-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Auto-saved
                </div>
              </div>
              <div className="flex-1 bg-white relative flex items-center justify-center overflow-hidden rounded-b-xl">
                {/* Mock Live Preview Area */}
                <div className="absolute inset-0 bg-stone-100 flex flex-col shadow-inner">
                  <div className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-8 shadow-sm relative z-20">
                    <div className="font-serif text-xl font-bold text-stone-900">Magnolia Bridal</div>
                    <div className="flex gap-6 text-sm font-medium text-stone-600">
                      <span className="hover:text-stone-900 cursor-pointer">Designers</span>
                      <span className="hover:text-stone-900 cursor-pointer">Dresses</span>
                      <span className="hover:text-stone-900 cursor-pointer">Our Story</span>
                    </div>
                    <button className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold rounded transition-colors shadow-sm">Book Now</button>
                  </div>
                  <div className="flex-1 relative flex items-center justify-center bg-stone-200 overflow-hidden">
                    {/* Placeholder image background */}
                    <div className="absolute inset-0 bg-gradient-to-b from-stone-900/10 to-stone-900/60 mix-blend-multiply" />
                    
                    <div className="relative z-10 text-center space-y-4 p-8 ring-4 ring-brand-primary ring-opacity-100 rounded-xl bg-white/95 backdrop-blur-md cursor-pointer hover:shadow-xl transition-all shadow-lg mx-4 md:mx-auto max-w-2xl transform scale-100 hover:scale-[1.02]">
                      <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-900">Find Your Perfect Gown.</h2>
                      <p className="text-lg text-stone-600 font-medium">Exclusive collections. Private styling suites. Unforgettable experiences.</p>
                      <button className="px-8 py-3 bg-stone-900 text-white font-bold mt-4 rounded hover:bg-stone-800 transition-colors shadow-md">View Collections</button>
                      
                      <div className="absolute -top-3 -right-3 bg-brand-primary text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded shadow-md">Editing Hero</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="max-w-4xl space-y-6 animate-in fade-in">
          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="border-b border-stone-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-stone-900">
                <Store className="w-5 h-5 text-emerald-600" />
                Local Inventory Sync (Google Shopping)
              </CardTitle>
              <CardDescription>
                Automatically publish your in-stock gowns to Google Search so local brides can see exactly what you carry before booking an appointment.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {isDemoMode ? (
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-emerald-200 shadow-sm">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-emerald-900 font-bold">Sync is Active</h3>
                      <p className="text-sm text-emerald-700 font-medium">Last synced 14 minutes ago. 412 products indexed.</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 border border-emerald-200 bg-white rounded-lg text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm">
                    Force Sync Now
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-amber-200 shadow-sm">
                      <Store className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-amber-900 font-bold">Setup Required</h3>
                      <p className="text-sm text-amber-700 font-medium">Connect your Google Merchant Center account to enable automated inventory syncing.</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-white border border-amber-200 rounded-lg text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors shadow-sm">
                    Connect Account
                  </button>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-stone-100">
                <h4 className="text-sm font-bold text-stone-900">Visibility Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-stone-50 border border-stone-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-stone-900 font-semibold">Hide Discontinued Gowns</span>
                      <div className="w-8 h-5 bg-brand-primary rounded-full relative cursor-pointer shadow-inner">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 font-medium">Automatically unpublish gowns marked as discontinued from your public catalog.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-stone-50 border border-stone-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-stone-900 font-semibold">Require Appointment for Price</span>
                      <div className="w-8 h-5 bg-stone-300 rounded-full relative cursor-pointer shadow-inner">
                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 font-medium">Hide prices on Google Shopping and your website. Displays "Call for Pricing".</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'seo' && (
        <div className="max-w-4xl space-y-6 animate-in fade-in">
          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="border-b border-stone-100 pb-4">
              <CardTitle className="text-lg text-stone-900">Global SEO Metadata</CardTitle>
              <CardDescription>Configure how your storefront appears in search engine results.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-900">Default Title Tag Format</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value="{{page_title}} | {{store_name}} | {{city}}, {{state}}"
                      readOnly
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2.5 text-sm text-stone-700 font-mono outline-none shadow-inner"
                    />
                  </div>
                  <button className="px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors shadow-sm flex items-center gap-2">
                    <Code className="w-4 h-4" /> Edit Format
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-900">Default Meta Description</label>
                <textarea 
                  rows={3}
                  defaultValue="Find your dream wedding dress at The Modern Bride in Chicago, IL. We carry exclusive designer collections in a luxury, private suite experience. Book your appointment today."
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm text-stone-700 resize-none outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent shadow-inner"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="border-b border-stone-100 pb-4">
              <CardTitle className="text-lg text-stone-900">Technical SEO</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-stone-50">
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Auto-generate Sitemap.xml</h4>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">Keeps Google instantly updated when you add new designers or gowns.</p>
                </div>
                <div className="w-10 h-6 bg-brand-primary rounded-full relative cursor-pointer shadow-inner">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-stone-50">
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Canonical URL Enforcement</h4>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">Prevents duplicate content penalties for filtered inventory pages.</p>
                </div>
                <div className="w-10 h-6 bg-brand-primary rounded-full relative cursor-pointer shadow-inner">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
