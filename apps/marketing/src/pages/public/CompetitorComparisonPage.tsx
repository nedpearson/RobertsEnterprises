import React, { useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, BarChart3, Search, Users, Link as LinkIcon, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CompetitorComparisonPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#080B12] text-stone-300 font-sans selection:bg-rose-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080B12]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-900/30 transition-transform group-hover:scale-105">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-serif text-xl font-bold text-white tracking-tight">VowOS</span>
          </a>
          <button 
            onClick={() => navigate('/demo-request?type=DEMO')}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#080B12] transition-transform hover:scale-105"
          >
            Get a Demo
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose-500/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-rose-300 mb-8">
            <BarChart3 className="w-4 h-4" /> VowOS vs BridalLive
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white leading-tight mb-6">
            Stop Exporting.<br/>Start <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-300">Growing.</span>
          </h1>
          <p className="text-lg md:text-xl text-stone-400 max-w-2xl mx-auto leading-relaxed">
            BridalLive views marketing as something you export data into. VowOS views marketing as the beginning of the operational funnel. Compare the industry standard to the modern Growth Operating System.
          </p>
        </div>
      </div>

      {/* The Matrix */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-sm shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 bg-[#0c101a] border-b border-white/10">
            <div className="p-8 hidden md:block">
              <h3 className="text-lg font-semibold text-white">Capability</h3>
            </div>
            <div className="p-8 border-l border-white/5 bg-[#141a29]">
              <h3 className="text-xl font-bold text-stone-400 text-center">BridalLive</h3>
            </div>
            <div className="p-8 border-l border-white/5 bg-gradient-to-b from-rose-900/40 to-[#141a29]">
              <h3 className="text-2xl font-bold text-white text-center">VowOS</h3>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 hover:bg-white/[0.02] transition-colors">
              <div className="p-6 md:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="font-semibold text-white text-lg">Marketing Attribution</h4>
                </div>
                <p className="text-sm text-stone-500">How do you know which ads drove revenue?</p>
              </div>
              <div className="p-6 md:p-8 border-t md:border-t-0 md:border-l border-white/5 bg-[#141a29]/50 flex flex-col justify-center text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-stone-400 mb-2">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Basic Analytics</span>
                </div>
                <p className="text-sm text-stone-500">Relies on basic GA4 and Meta Pixel source tracking. Fragmented revenue visibility.</p>
              </div>
              <div className="p-6 md:p-8 border-t md:border-t-0 md:border-l border-white/5 flex flex-col justify-center text-center md:text-left bg-gradient-to-r from-rose-500/5 to-transparent">
                <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">End-to-End Deep Attribution</span>
                </div>
                <p className="text-sm text-stone-300">Campaign → Click → Lead → Appointment → Customer → Sale → Revenue fully tracked in the core database.</p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 hover:bg-white/[0.02] transition-colors">
              <div className="p-6 md:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Search className="w-4 h-4 text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-white text-lg">Local SEO & Google</h4>
                </div>
                <p className="text-sm text-stone-500">Google Business Profiles & Maps ranking.</p>
              </div>
              <div className="p-6 md:p-8 border-t md:border-t-0 md:border-l border-white/5 bg-[#141a29]/50 flex flex-col justify-center text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-stone-400 mb-2">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Paid Add-on Required</span>
                </div>
                <p className="text-sm text-stone-500">Requires expensive third-party reputation add-ons to manage listings.</p>
              </div>
              <div className="p-6 md:p-8 border-t md:border-t-0 md:border-l border-white/5 flex flex-col justify-center text-center md:text-left bg-gradient-to-r from-rose-500/5 to-transparent">
                <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">Native OAuth Integration</span>
                </div>
                <p className="text-sm text-stone-300">Directly connect your Google Accounts to VowOS locations. Track maps views and website clicks alongside booked appointments.</p>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 hover:bg-white/[0.02] transition-colors">
              <div className="p-6 md:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Star className="w-4 h-4 text-amber-400" />
                  </div>
                  <h4 className="font-semibold text-white text-lg">Review Management</h4>
                </div>
                <p className="text-sm text-stone-500">Monitoring Google & Yelp reviews.</p>
              </div>
              <div className="p-6 md:p-8 border-t md:border-t-0 md:border-l border-white/5 bg-[#141a29]/50 flex flex-col justify-center text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-stone-400 mb-2">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Paid Add-on ($119/mo)</span>
                </div>
                <p className="text-sm text-stone-500">An additional monthly fee to centralize reviews from Google, Yelp, and Facebook.</p>
              </div>
              <div className="p-6 md:p-8 border-t md:border-t-0 md:border-l border-white/5 flex flex-col justify-center text-center md:text-left bg-gradient-to-r from-rose-500/5 to-transparent">
                <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">Included Native AI Center</span>
                </div>
                <p className="text-sm text-stone-300">Included standard. Plus, VowOS uses Generative AI to pre-draft highly personalized responses to reviews based on the customer's actual sales history.</p>
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1 md:grid-cols-3 hover:bg-white/[0.02] transition-colors">
              <div className="p-6 md:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <LinkIcon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h4 className="font-semibold text-white text-lg">Modern Architecture</h4>
                </div>
                <p className="text-sm text-stone-500">System speed, API availability, and reliability.</p>
              </div>
              <div className="p-6 md:p-8 border-t md:border-t-0 md:border-l border-white/5 bg-[#141a29]/50 flex flex-col justify-center text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-stone-400 mb-2">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Legacy Technology</span>
                </div>
                <p className="text-sm text-stone-500">Older tech stack, limited native headless e-commerce support, reliance on batch-syncing.</p>
              </div>
              <div className="p-6 md:p-8 border-t md:border-t-0 md:border-l border-white/5 flex flex-col justify-center text-center md:text-left bg-gradient-to-r from-rose-500/5 to-transparent">
                <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">React, Supabase, API-First</span>
                </div>
                <p className="text-sm text-stone-300">Lightning fast Single Page Application. Real-time PostgreSQL websockets. Perfect for building custom headless websites that talk directly to your POS.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-white mb-6">Ready to close the loop?</h2>
          <p className="text-stone-400 mb-8">
            Join the forward-thinking boutiques migrating to VowOS. We offer white-glove data migration from BridalLive to ensure zero downtime.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/demo-request?type=PLAN')}
              className="w-full sm:w-auto rounded-full bg-rose-500 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/25 flex items-center justify-center gap-2"
            >
              Request Pricing & Migration Plan <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => navigate('/demo')}
              className="w-full sm:w-auto rounded-full border border-white/20 bg-transparent px-8 py-4 text-sm font-bold text-white transition-all hover:bg-white/5 flex items-center justify-center"
            >
              Play with Interactive Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
