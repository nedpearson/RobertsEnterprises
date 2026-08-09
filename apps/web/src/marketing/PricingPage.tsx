import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ChevronDown, ChevronUp, Sparkles, Store, TrendingUp, Building2, Star } from 'lucide-react';
import { VOWOS_CATALOG, PLANS, type CommercialPlan } from './commercialCatalog';

const tierDetails: Record<CommercialPlan, { price: string; description: string; highlight?: boolean; icon: React.ReactNode }> = {
  essentials: {
    price: '$249',
    description: 'Perfect for single-location boutiques starting out.',
    icon: <Store className="w-6 h-6 text-rose-500" />
  },
  growth: {
    price: '$449',
    highlight: true,
    description: 'For ambitious businesses looking to expand and automate.',
    icon: <TrendingUp className="w-6 h-6 text-purple-500" />
  },
  pro: {
    price: '$749',
    description: 'Advanced intelligence and multi-location capabilities.',
    icon: <Star className="w-6 h-6 text-indigo-500" />
  },
  enterprise: {
    price: 'Custom',
    description: 'The ultimate command center for franchisors and large chains.',
    icon: <Building2 className="w-6 h-6 text-slate-800" />
  }
};

export default function PricingPage() {
  const [matrixExpanded, setMatrixExpanded] = useState(false);
  const navigate = useNavigate();

  const handleSelectPlan = (planId: CommercialPlan) => {
    navigate('/signup', { state: { selectedPlan: planId } });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-rose-200">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-2xl font-bold tracking-tight text-slate-900">Vow<span className="text-rose-600">OS</span></span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/login')} className="text-sm font-medium text-slate-600 hover:text-slate-900">Log in</button>
            <button onClick={() => navigate('/signup')} className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-slate-800 transition-colors">Start Free Trial</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            The bridal operating system built for scale.
          </h1>
          <p className="text-lg text-slate-600">
            From single-location boutiques to global franchise networks, VowOS gives you the exact tools you need to grow revenue, optimize inventory, and deliver perfect experiences.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {(Object.entries(PLANS) as [CommercialPlan, typeof PLANS[CommercialPlan]][]).map(([planId, plan]) => {
            const details = tierDetails[planId];
            const isGrowth = details.highlight;
            
            return (
              <div 
                key={planId} 
                className={`relative flex flex-col bg-white rounded-2xl p-8 transition-all duration-300 shadow-sm border-2 ${
                  isGrowth ? 'border-rose-500 scale-105 shadow-xl shadow-rose-500/10 z-10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {isGrowth && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <Sparkles className="w-3 h-3" /> Most Popular
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-xl ${isGrowth ? 'bg-rose-50' : 'bg-slate-50'}`}>
                    {details.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{plan.label.replace('VowOS ', '')}</h3>
                </div>
                
                <div className="mb-4">
                  <span className="text-4xl font-extrabold text-slate-900">{details.price}</span>
                  {details.price !== 'Custom' && <span className="text-slate-500 font-medium">/location/month</span>}
                </div>
                
                <p className="text-sm text-slate-600 mb-8 min-h-[40px]">
                  {details.description}
                </p>
                
                <button 
                  onClick={() => handleSelectPlan(planId)}
                  className={`mt-auto w-full py-3 px-4 rounded-xl font-bold text-sm transition-colors ${
                    isGrowth 
                      ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm' 
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {planId === 'enterprise' ? 'Contact Sales' : 'Get Started'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Comparison Matrix Toggle */}
        <div className="flex justify-center mb-12">
          <button 
            onClick={() => setMatrixExpanded(!matrixExpanded)}
            className="flex items-center gap-2 text-slate-900 font-bold hover:text-rose-600 transition-colors bg-white px-6 py-3 rounded-full shadow-sm border border-slate-200"
          >
            COMPARE ALL VOWOS FEATURES 
            {matrixExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Feature Comparison Matrix */}
        {matrixExpanded && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-6 font-bold text-slate-900 w-1/3">Features by Module</th>
                    <th className="py-4 px-6 font-bold text-slate-900 text-center w-1/6">Essentials</th>
                    <th className="py-4 px-6 font-bold text-slate-900 text-center w-1/6">Growth</th>
                    <th className="py-4 px-6 font-bold text-slate-900 text-center w-1/6">Pro</th>
                    <th className="py-4 px-6 font-bold text-slate-900 text-center w-1/6">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(VOWOS_CATALOG.modules).map((module) => (
                    <React.Fragment key={module.id}>
                      {/* Module Header */}
                      <tr className="bg-slate-100/50 border-b border-slate-200">
                        <td colSpan={5} className="py-3 px-6 font-bold text-slate-800 text-sm tracking-wide uppercase">
                          {module.label}
                        </td>
                      </tr>
                      {/* Features */}
                      {Object.values(module.features).map((feature) => (
                        <tr key={feature.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-6 text-sm text-slate-600 font-medium flex items-center gap-2">
                            {feature.label}
                            {feature.addOnEligible && <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">Add-on</span>}
                          </td>
                          {(Object.keys(PLANS) as CommercialPlan[]).map((planId) => {
                            const included = PLANS[planId].includedFeatures.includes(feature.id);
                            return (
                              <td key={planId} className="py-3 px-6 text-center border-l border-slate-100">
                                {included ? (
                                  <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                                ) : (
                                  <X className="w-4 h-4 text-slate-300 mx-auto" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer CTA */}
      <footer className="bg-slate-900 text-white py-16 mt-24">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-6">Ready to transform your bridal business?</h2>
          <p className="text-slate-400 mb-8 text-lg">Join the hundreds of successful boutiques already running on VowOS.</p>
          <button onClick={() => navigate('/signup')} className="bg-rose-500 text-white font-bold px-8 py-4 rounded-xl hover:bg-rose-600 transition-colors text-lg shadow-lg shadow-rose-500/20">
            Start Your Journey
          </button>
        </div>
      </footer>
    </div>
  );
}
