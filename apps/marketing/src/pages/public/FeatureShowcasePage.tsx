import React, { useEffect } from 'react';
import { ArrowRight, Calendar, ShoppingBag, BarChart3, MessageSquare, PlayCircle, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MotionFadeIn, MotionStaggerContainer, MotionStaggerItem, MotionScaleUp } from '@/components/motion/MotionWrapper';

export function FeatureShowcasePage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#080B12] text-stone-300 font-sans selection:bg-rose-500/30 overflow-hidden">
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

      {/* Hero */}
      <div className="pt-40 pb-20 px-6 relative">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-500/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3" 
        />
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <MotionFadeIn>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-rose-300 mb-8">
              <PlayCircle className="w-4 h-4" /> The System In Motion
            </div>
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight mb-6">
              A Symphony of<br/>Retail Operations.
            </h1>
            <p className="text-lg text-stone-400 mb-8 max-w-lg leading-relaxed">
              Watch how VowOS connects every disconnected part of your boutique. From the first Google search to the final dress fitting, everything flows perfectly.
            </p>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/demo')}
                className="rounded-full bg-rose-500 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/25 flex items-center gap-2"
              >
                Play with Interactive Demo <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </MotionFadeIn>

          {/* Interactive CSS Motion Mockup */}
          <MotionScaleUp delay={0.2} className="relative h-[600px] w-full perspective-[2000px]">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/20 to-indigo-500/20 blur-3xl rounded-full" />
            
            {/* iPad Pro Mockup Container */}
            <motion.div 
              initial={{ rotateY: -15, rotateX: 5 }}
              whileHover={{ rotateY: 0, rotateX: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 preserve-3d"
            >
              <div className="absolute inset-0 bg-stone-900 rounded-[2.5rem] border-[8px] border-stone-800 shadow-2xl shadow-black overflow-hidden ring-1 ring-white/10">
                {/* Fake App Header */}
                <div className="h-16 border-b border-white/10 bg-[#1c1a1f] flex items-center justify-between px-6">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <div className="text-xs font-bold text-stone-500 tracking-widest uppercase">VowOS Unified Dashboard</div>
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                </div>
                
                {/* Fake App Body with Animations */}
                <div className="p-6 grid grid-cols-3 gap-6 h-full bg-[#0c101a]">
                  {/* Left Column (Appointments) */}
                  <div className="col-span-1 space-y-4">
                    <motion.div 
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="h-32 rounded-2xl bg-white/5 border border-white/10 p-4"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 mb-3 flex items-center justify-center"><Calendar className="w-4 h-4 text-emerald-400" /></div>
                      <div className="h-2 w-24 bg-white/20 rounded-full mb-2" />
                      <div className="h-2 w-32 bg-white/10 rounded-full" />
                    </motion.div>
                    <motion.div 
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 3.5, delay: 0.2, repeat: Infinity, ease: "easeInOut" }}
                      className="h-48 rounded-2xl bg-white/5 border border-white/10 p-4"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-500/20 mb-3 flex items-center justify-center"><Store className="w-4 h-4 text-rose-400" /></div>
                      <div className="h-2 w-20 bg-white/20 rounded-full mb-2" />
                      <div className="h-2 w-24 bg-white/10 rounded-full mb-4" />
                      <div className="h-16 w-full bg-rose-500/10 rounded-xl border border-rose-500/20" />
                    </motion.div>
                  </div>

                  {/* Middle & Right Column (Dashboard) */}
                  <div className="col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <motion.div 
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 4, delay: 0.4, repeat: Infinity, ease: "easeInOut" }}
                        className="h-24 rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-center"
                      >
                        <div className="text-xs text-stone-500 mb-1">Today's Revenue</div>
                        <div className="text-2xl font-bold text-white">$12,450</div>
                      </motion.div>
                      <motion.div 
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2.5, delay: 0.6, repeat: Infinity, ease: "easeInOut" }}
                        className="h-24 rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-center"
                      >
                        <div className="text-xs text-stone-500 mb-1">Active Leads</div>
                        <div className="text-2xl font-bold text-white">48</div>
                      </motion.div>
                    </div>
                    <div className="h-[260px] rounded-2xl bg-gradient-to-br from-rose-900/40 to-transparent border border-rose-500/20 p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-2xl" />
                      <div className="flex items-center gap-3 mb-6">
                        <BarChart3 className="w-5 h-5 text-rose-400" />
                        <span className="font-bold text-white">Growth OS Active</span>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="h-2 w-32 bg-white/20 rounded-full" />
                          <div className="h-2 w-12 bg-rose-400 rounded-full" />
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: "75%" }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-rose-500" 
                          />
                        </div>
                        
                        <div className="flex items-center justify-between mt-6">
                          <div className="h-2 w-24 bg-white/20 rounded-full" />
                          <div className="h-2 w-16 bg-emerald-400 rounded-full" />
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: "45%" }}
                            transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                            className="h-full bg-emerald-500" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </MotionScaleUp>
        </div>
      </div>

      {/* Feature Grid */}
      <MotionStaggerContainer className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <MotionStaggerItem className="text-center mb-16">
          <h2 className="text-3xl font-serif font-bold text-white mb-4">Everything connects. Perfectly.</h2>
        </MotionStaggerItem>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <MotionStaggerItem className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
              <ShoppingBag className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Flawless Point of Sale</h3>
            <p className="text-stone-400 text-sm leading-relaxed">
              Ring up complex multi-tender special orders in seconds. VowOS automatically calculates vendor lead times and warns if a dress won't arrive before the wedding date.
            </p>
          </MotionStaggerItem>
          
          <MotionStaggerItem className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Unified Communications</h3>
            <p className="text-stone-400 text-sm leading-relaxed">
              SMS and email are built directly into the CRM. When a bride texts "I'm here!", your consultants get a notification instantly on their iPads.
            </p>
          </MotionStaggerItem>
          
          <MotionStaggerItem className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Growth OS Analytics</h3>
            <p className="text-stone-400 text-sm leading-relaxed">
              Stop guessing. See exactly which Google search terms resulted in the most revenue. Respond to reviews instantly. Outsmart your local competition.
            </p>
          </MotionStaggerItem>
        </div>
      </MotionStaggerContainer>
    </div>
  );
}
