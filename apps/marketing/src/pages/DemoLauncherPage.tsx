import React, { useState, useEffect } from 'react';
import { useDemo } from '@/lib/demo/demoContext';
import { Sparkles, Play, Eye, Compass, Target, ChevronRight, Settings, CheckCircle, BarChart3, Users, CalendarClock, ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DemoLauncherPage() {
  const { scenarios, startScenario, stopScenario } = useDemo();
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mobile') === 'true') {
      const mobileScenario = scenarios.find(s => s.id === 'scenario-41-mobile-briefing');
      if (mobileScenario) {
        startScenario(mobileScenario.id, 'watch', (r) => navigate('/' + r));
      }
    }
  }, [scenarios, startScenario, navigate]);

  const handleWatchDemo = () => {
    startScenario(scenarios[0]?.id || '', 'watch', (r) => navigate('/' + r));
  };

  const handleGuideMe = () => {
    startScenario(selectedScenarioId, 'guide', (r) => navigate('/' + r));
  };

  const handleExploreFreely = () => {
    stopScenario();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 lg:px-12 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800/60">
        <div className="font-black text-2xl tracking-tighter">
          Vow<span className="text-brand-primary">OS</span>
        </div>
        <div className="flex gap-4 items-center">
          <a href="/pricing" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Pricing</a>
          <a href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Sign In</a>
          <a href="/signup" className="bg-brand-primary hover:bg-brand-primary-hover text-white px-4 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-brand-primary/20">
            Start Free Trial
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-20 pb-24 lg:pt-32 lg:pb-40 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-bold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles className="h-4 w-4" /> Experience the Full Power of VowOS
        </div>
        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl tracking-tight text-white mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          See Exactly How Your <br className="hidden sm:block"/>Boutique Will Run.
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg sm:text-xl mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          This isn't a slideshow. Enter a fully-populated, live sandbox loaded with robust synthetic data. Explore appointments, CRM, POS, and analytics as if it were your own store.
        </p>

        {/* Demo Launch Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl relative z-10 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          <button
            onClick={handleWatchDemo}
            className="group flex flex-col items-center text-center p-8 rounded-3xl border border-brand-primary/50 bg-brand-primary/10 hover:bg-brand-primary/20 transition-all shadow-[0_0_30px_rgba(213,81,98,0.15)] ring-1 ring-brand-primary/30">
            <div className="h-16 w-16 rounded-full bg-brand-primary text-white flex items-center justify-center mb-6 shadow-lg shadow-brand-primary/30 group-hover:scale-110 transition-transform">
              <Eye className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Watch Auto-Pilot</h3>
            <p className="text-brand-primary/80 text-sm">Sit back as VowOS takes you on a guided tour of key features.</p>
          </button>

          <button
            onClick={handleGuideMe}
            className="group flex flex-col items-center text-center p-8 rounded-3xl border border-indigo-500/50 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all shadow-[0_0_30px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30">
            <div className="h-16 w-16 rounded-full bg-indigo-500 text-white flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
              <Compass className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Interactive Guide</h3>
            <p className="text-indigo-300/80 text-sm">Learn by doing with interactive, on-screen guidance.</p>
          </button>

          <button
            onClick={handleExploreFreely}
            className="group flex flex-col items-center text-center p-8 rounded-3xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700 transition-all">
            <div className="h-16 w-16 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Target className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Explore Sandbox</h3>
            <p className="text-slate-400 text-sm">Full access to the synthetic store. Click around freely.</p>
          </button>
        </div>
      </div>

      {/* Feature Highlights with Robust Data Pitch */}
      <div className="bg-slate-900 py-24 border-y border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-serif text-white mb-4">Why try the sandbox?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">We packed the demo with thousands of data points so you can see exactly how VowOS handles complexity at scale.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Users, title: '2,500+ Brides', desc: 'See how our CRM filters, searches, and segments thousands of client profiles instantly.' },
              { icon: CalendarClock, title: 'Live Scheduling', desc: 'Experience conflict resolution and multi-staff calendars spanning months of data.' },
              { icon: ShoppingBag, title: 'Inventory Sync', desc: 'Browse hundreds of designer gowns, variations, and live stock levels synced with Shopify.' },
              { icon: BarChart3, title: 'Financial Analytics', desc: 'Review populated flash sales, commission run rates, and daily revenue ledgers.' }
            ].map((f, i) => (
              <div key={i} className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <f.icon className="h-8 w-8 text-indigo-400 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscription CTA / Bottom Funnel */}
      <div className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-primary/5" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl font-serif text-white mb-6">Ready to modernize your boutique?</h2>
          <p className="text-xl text-slate-300 mb-10">
            Join hundreds of bridal stores running entirely on VowOS. Start your free trial today and import your existing data seamlessly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/signup" className="inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl shadow-brand-primary/20">
              Start Your Free Trial <ArrowRight className="h-5 w-5" />
            </a>
            <a href="/pricing" className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-full text-lg font-bold transition-all">
              View Pricing Plans
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-500">No credit card required. Cancel anytime.</p>
        </div>
      </div>
    </div>
  );
}
