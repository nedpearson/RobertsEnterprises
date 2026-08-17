import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { featureRegistry } from '@/config/featureRegistry';
import { motion } from 'framer-motion';
import { MotionFadeIn, MotionStaggerContainer, MotionStaggerItem, MotionHoverCard } from '@/components/motion/MotionWrapper';

export function PricingPage() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const tiers = [
    {
      name: 'Essentials',
      description: 'Everything a new boutique needs to run scheduling, inventory, and point of sale.',
      priceMonthly: 129,
      priceAnnual: 109,
      highlight: false,
      features: [
        'Core Point of Sale',
        'Appointment Scheduling',
        'Basic Inventory Management',
        'Customer Profiles (CRM)',
        'Standard Reporting',
      ]
    },
    {
      name: 'Growth',
      description: 'The operating system for growing boutiques demanding marketing and deep attribution.',
      priceMonthly: 249,
      priceAnnual: 199,
      highlight: true,
      badge: 'Most Popular',
      features: [
        'Everything in Essentials',
        'Growth OS & Attribution',
        'Local SEO & Google Integration',
        'AI Reputation Management',
        'Competitor Intelligence',
        'Automated Messaging (SMS/Email)'
      ]
    },
    {
      name: 'Enterprise',
      description: 'Multi-location architecture with custom integrations and dedicated support.',
      priceMonthly: 'Custom Quote',
      priceAnnual: 'Custom Quote',
      highlight: false,
      features: [
        'Everything in Growth',
        'Multi-Store Inventory Sync',
        'Consolidated Roll-up Reporting',
        'Custom API Access',
        'White-Glove Data Migration',
        'Dedicated Account Manager'
      ]
    }
  ];

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
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/compare')}
              className="hidden md:flex rounded-full bg-white/5 border border-white/10 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              vs BridalLive
            </button>
            <button 
              onClick={() => navigate('/demo-request?type=DEMO')}
              className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#080B12] transition-transform hover:scale-105"
            >
              Get a Demo
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-24 px-6 relative">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-rose-500/10 to-transparent pointer-events-none" 
        />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <MotionFadeIn className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-6">
              Transparent Pricing.<br/>No Hidden Fees.
            </h1>
            <p className="text-lg text-stone-400 mb-10">
              Unlike legacy competitors, we publish our pricing openly for growing boutiques. High volume or multi-store operators get tailored discounting.
            </p>
            
            <div className="inline-flex items-center rounded-full border border-white/10 bg-[#141a29] p-1">
              <button 
                onClick={() => setAnnual(false)}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${!annual ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-white'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setAnnual(true)}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${annual ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-white'}`}
              >
                Annually <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Save 20%</span>
              </button>
            </div>
          </MotionFadeIn>

          <MotionStaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tiers.map((tier) => (
              <MotionHoverCard 
                key={tier.name}
                className={`relative rounded-3xl p-8 flex flex-col ${
                  tier.highlight 
                    ? 'bg-gradient-to-b from-[#1a1525] to-[#0c0f1a] border-2 border-rose-500/50 shadow-2xl shadow-rose-900/20 transform md:-translate-y-4' 
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-full shadow-lg">
                    {tier.badge}
                  </div>
                )}
                
                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-stone-400 text-sm h-12">{tier.description}</p>
                
                <div className="my-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      {typeof tier.priceMonthly === 'number' ? '$' : ''}{annual ? tier.priceAnnual : tier.priceMonthly}
                    </span>
                    {typeof tier.priceMonthly === 'number' && (
                      <span className="text-stone-500">/mo</span>
                    )}
                  </div>
                  {typeof tier.priceMonthly === 'number' && (
                    <p className="text-xs text-stone-500 mt-1">
                      {annual ? 'Billed annually' : 'Billed monthly'}
                    </p>
                  )}
                </div>

                <button 
                  onClick={() => navigate('/demo-request?type=PLAN&tier=' + tier.name)}
                  className={`w-full py-4 rounded-xl text-sm font-bold transition-all mb-8 ${
                    tier.highlight 
                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25' 
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                >
                  {tier.name === 'Enterprise' ? 'Contact Sales' : 'Start Free Trial'}
                </button>

                <div className="flex-1 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-4">Includes:</p>
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-sm text-stone-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </MotionHoverCard>
            ))}
          </MotionStaggerContainer>
          
          <MotionFadeIn delay={0.4} className="mt-24 pt-16 border-t border-white/5">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-serif font-bold text-white mb-4">System Entitlements Architecture</h2>
              <p className="text-stone-400 max-w-2xl mx-auto">
                Our pricing is backed by a strict Entitlements Registry. We only charge for the features you are actively provisioned for. Here is a live read of the VowOS underlying registry:
              </p>
            </div>
            <MotionStaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(featureRegistry).map(([key, feature]) => (
                <MotionStaggerItem key={key} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${feature.minimumPlan === 'essentials' ? 'bg-emerald-400' : feature.minimumPlan === 'enterprise' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                  <div>
                    <h4 className="text-sm font-bold text-white">{feature.name}</h4>
                    <p className="text-xs text-stone-500 mt-1">{feature.shortDescription}</p>
                  </div>
                </MotionStaggerItem>
              ))}
            </MotionStaggerContainer>
          </MotionFadeIn>
        </div>
      </div>
    </div>
  );
}
