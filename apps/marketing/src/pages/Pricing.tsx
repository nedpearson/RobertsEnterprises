import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Building2, Store, Briefcase, ChevronRight } from 'lucide-react';
import { PLANS, VOWOS_CATALOG, CommercialPlan } from '@/config/commercialCatalog';

export default function Pricing() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);

  const handleSelectPlan = (planId: CommercialPlan) => {
    navigate(`/signup?plan=${planId}&billing=${isAnnual ? 'annual' : 'monthly'}`);
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans selection:bg-brand-primary selection:text-white">
      <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link to="/" className="text-2xl font-serif text-stone-900 tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">V</span>
              </span>
              VowOS
            </Link>
            <div className="hidden md:flex gap-8 text-sm font-medium text-stone-600">
              <Link to="/#features" className="hover:text-stone-900 transition-colors">Platform</Link>
              <Link to="/pricing" className="text-stone-900">Pricing</Link>
              <Link to="/demo" className="hover:text-stone-900 transition-colors">Interactive Demo</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')} className="hidden sm:inline-flex">Log In</Button>
            <Button onClick={() => navigate('/demo')} className="bg-brand-primary text-white hover:bg-brand-secondary">Book a Demo</Button>
          </div>
        </div>
      </nav>

      <main className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl font-serif text-stone-900 tracking-tight mb-6">
            One Operating System for the Entire Business
          </h1>
          <p className="text-xl text-stone-600 leading-relaxed mb-10">
            Stop paying for disconnected scheduling, CRM, and POS tools. Select the package that fits your growth stage.
          </p>
          
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-stone-900' : 'text-stone-500'}`}>Monthly</span>
            <button 
              className="relative w-14 h-8 rounded-full bg-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors data-[state=checked]:bg-brand-primary"
              data-state={isAnnual ? 'checked' : 'unchecked'}
              onClick={() => setIsAnnual(!isAnnual)}
            >
              <span className={`absolute top-1 bg-white w-6 h-6 rounded-full shadow transition-transform duration-200 ease-in-out ${isAnnual ? 'translate-x-7 left-0' : 'translate-x-1 left-0'}`} />
            </button>
            <span className={`text-sm font-medium flex items-center gap-2 ${isAnnual ? 'text-stone-900' : 'text-stone-500'}`}>
              Annually <span className="text-[10px] uppercase tracking-widest bg-brand-primary/10 text-brand-primary px-2 py-1 rounded-full font-bold">Save 20%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
          {(Object.entries(PLANS) as [CommercialPlan, typeof PLANS[CommercialPlan]][]).map(([planId, planDef]) => {
            const isPopular = planId === 'growth';
            
            const icon = planId === 'essentials' ? <Store className="w-10 h-10 text-brand-primary" /> : 
                         planId === 'pro' ? <Briefcase className="w-10 h-10 text-brand-primary" /> : 
                         <Building2 className="w-10 h-10 text-brand-primary" />;

            return (
              <Card key={planId} className={`relative flex flex-col ${isPopular ? 'border-brand-primary shadow-xl scale-105 z-10' : 'border-stone-200'}`}>
                {isPopular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-primary text-white text-[10px] uppercase tracking-widest font-bold px-4 py-1 rounded-full shadow-sm">
                    Most Popular
                  </div>
                )}
                <CardHeader className="text-center pt-8 pb-4">
                  <div className="flex justify-center mb-4">{icon}</div>
                  <CardTitle className="text-2xl font-serif text-stone-900">{planDef.label}</CardTitle>
                  <CardDescription className="text-sm font-medium text-brand-primary uppercase tracking-wider mt-2">{planDef.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 text-center pb-8">
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-stone-900">${isAnnual ? planDef.annual : planDef.monthly}</span>
                    <span className="text-stone-500">/mo</span>
                  </div>
                  <p className="text-sm text-stone-600 mb-8 px-4 h-12">{planDef.description}</p>
                  
                  <div className="text-left space-y-3 px-2">
                    {/* Just highlighting top level modules included */}
                    <div className="flex items-start gap-3 text-sm text-stone-700">
                      <Check className="w-5 h-5 text-brand-primary shrink-0" />
                      <span>CRM & Appointments</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-stone-700">
                      <Check className="w-5 h-5 text-brand-primary shrink-0" />
                      <span>Point of Sale & Inventory</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-stone-700">
                      <Check className="w-5 h-5 text-brand-primary shrink-0" />
                      <span>Basic Reporting</span>
                    </div>
                    {planId !== 'essentials' && (
                      <div className="flex items-start gap-3 text-sm text-stone-700">
                        <Check className="w-5 h-5 text-brand-primary shrink-0" />
                        <span className="font-medium text-stone-900">Marketing & Lead Automations</span>
                      </div>
                    )}
                    {(planId === 'pro' || planId === 'enterprise') && (
                      <div className="flex items-start gap-3 text-sm text-stone-700">
                        <Check className="w-5 h-5 text-brand-primary shrink-0" />
                        <span className="font-medium text-stone-900">Shopify & AI Recommendations</span>
                      </div>
                    )}
                    {planId === 'enterprise' && (
                      <div className="flex items-start gap-3 text-sm text-stone-700">
                        <Check className="w-5 h-5 text-brand-primary shrink-0" />
                        <span className="font-medium text-stone-900">Multi-Location & Custom Domain</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-4 pb-8">
                  <Button 
                    className={`w-full ${isPopular ? 'bg-brand-primary text-white hover:bg-brand-secondary' : 'bg-stone-100 text-stone-900 hover:bg-stone-200'}`}
                    size="lg"
                    onClick={() => handleSelectPlan(planId)}
                  >
                    Start Free Trial
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-24 text-center">
          <h2 className="text-3xl font-serif text-stone-900 mb-6">Not sure which plan is right for you?</h2>
          <p className="text-lg text-stone-600 mb-8 max-w-2xl mx-auto">
            Book a personalized demonstration with our platform experts. We will walk you through the VowOS experience tailored for your exact operational needs.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="bg-brand-primary text-white px-8" onClick={() => navigate('/demo')}>
              Watch Interactive Demo
            </Button>
            <Button size="lg" variant="outline" className="border-stone-300 px-8" onClick={() => window.location.href = 'mailto:sales@bridgebox.ai'}>
              Book Sales Consultation
            </Button>
          </div>
        </div>
      </main>

      <footer className="bg-stone-900 text-stone-400 py-12 mt-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="text-2xl font-serif text-white tracking-tight flex items-center justify-center gap-2 mb-8">
            <span className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-bold">V</span>
            </span>
            VowOS
          </div>
          <div className="text-sm">
            &copy; 2026 Bridgebox AI, Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
