import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Zap, RefreshCw, Award, Lock, Sparkles, Building2, Store } from 'lucide-react';
import { getGoLiveReadinessReport } from '@/lib/services/goLiveReadinessService';
import { GoLiveReadinessReport } from '../types/trainingTypes';
import { guidedTourEngine } from '../services/guidedTourEngine';
import { OWNER_ONBOARDING_COURSE } from '../api/trainingApi';

export function OnboardingDashboard({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  const [report, setReport] = useState<GoLiveReadinessReport>(getGoLiveReadinessReport());

  const handleRefresh = () => {
    setReport(getGoLiveReadinessReport());
  };

  const startOwnerTour = () => {
    const allSteps = OWNER_ONBOARDING_COURSE.lessons.flatMap((l) => l.steps);
    guidedTourEngine.startTour(allSteps, 'guided');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Overall Readiness Score */}
      <div className="rounded-3xl bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 p-8 text-white shadow-xl relative overflow-hidden border border-stone-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Award className="h-64 w-64 text-rose-500" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
              <Sparkles className="h-3.5 w-3.5" /> VowOS Master Onboarding &amp; Go-Live Academy
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Boutique Setup &amp; Certification Dashboard
            </h1>
            <p className="text-stone-300 text-sm leading-relaxed">
              Step-by-step interactive onboarding for The Boutique, Proper &amp; Co., and I Do Bridal Couture. Machine-verifiable setup ensures your stores are 100% ready before launch.
            </p>
          </div>

          {/* Readiness Status Card */}
          <div className="rounded-2xl bg-stone-950/80 p-5 border border-stone-800 flex flex-col items-center justify-center min-w-[240px] text-center shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">System Go-Live Status</p>
            <div className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase mb-2 ${
              report.status === 'READY FOR PRODUCTION'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : report.status === 'READY WITH WARNINGS'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {report.status}
            </div>

            <div className="flex items-baseline gap-1 my-1">
              <span className="text-4xl font-black text-white">{report.readinessScore}%</span>
              <span className="text-xs text-stone-400 font-bold">Ready</span>
            </div>

            <button
              onClick={startOwnerTour}
              className="mt-3 w-full rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-rose-500 transition-all flex items-center justify-center gap-2"
              data-training-id="btn-start-master-tour"
            >
              <Play className="h-4 w-4 fill-white" /> Start Guided Tour
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Required Completed</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-stone-900">{report.completedCount} / {report.requiredTotal}</p>
          <p className="text-xs text-stone-500 mt-1">Setup phases machine-verified</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Blocking Issues</span>
            <AlertTriangle className="h-5 w-5 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-stone-900">{report.blockingCount}</p>
          <p className="text-xs text-stone-500 mt-1">Required actions before production</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Store Locations</span>
            <Store className="h-5 w-5 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-stone-900">2 Boutiques</p>
          <p className="text-xs text-stone-500 mt-1">Baton Rouge &amp; Covington</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Quick Actions</span>
            <RefreshCw className="h-4 w-4 text-stone-400 cursor-pointer hover:rotate-180 transition-transform" onClick={handleRefresh} />
          </div>
          <button
            onClick={() => onNavigateTab('golive-checklist')}
            className="w-full rounded-xl bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5"
          >
            Audit Checklist <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 23-Phase Quick Overview List */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-stone-900 text-base">Owner Onboarding Curriculum (23 Phases)</h3>
            <p className="text-xs text-stone-500">Interactive step-by-step master setup curriculum for The Boutique</p>
          </div>
          <button
            onClick={() => onNavigateTab('owner-setup')}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            View Full Curriculum <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {OWNER_ONBOARDING_COURSE.lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-3.5 flex items-start gap-3 hover:border-stone-300 transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs text-stone-900 truncate">{lesson.title}</p>
                <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{lesson.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
