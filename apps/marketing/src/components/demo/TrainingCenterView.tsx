import React, { useState } from 'react';
import { useDemo } from '@/lib/demo/demoContext';
import { PageHeader, btnPrimary } from '../vowos/ui';
import { GraduationCap, Play, CheckCircle2, Trophy, Sparkles, Award, Compass, Medal, Star, CalendarDays } from 'lucide-react';
import { ViewKey } from '../vowos/Sidebar';

export default function TrainingCenterView({ onNavigate }: { onNavigate?: (v: ViewKey) => void }) {
  const { scenarios, startScenario } = useDemo();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'All' | 'Owner' | 'Manager' | 'Bridal Consultant' | 'Payroll Administrator'>('All');

  const filteredScenarios = selectedRoleFilter === 'All'
    ? scenarios
    : scenarios.filter((s) => s.targetRole.toLowerCase().includes(selectedRoleFilter.toLowerCase()));

  const masterScenario = scenarios.find((s) => s.id === 'scenario-0-master-tour') || scenarios[0];

  const badges = [
    { id: 1, name: 'First Booking', icon: <CalendarDays className="h-5 w-5 text-indigo-500" />, desc: 'Booked your first appointment' },
    { id: 2, name: 'Sales Star', icon: <Star className="h-5 w-5 text-status-warning" />, desc: 'Closed 5 sales this month' },
    { id: 3, name: 'Inventory Pro', icon: <Compass className="h-5 w-5 text-status-success" />, desc: 'Completed all inventory modules' },
  ];

  const leaderboard = [
    { rank: 1, name: 'Sarah J.', points: 4250, role: 'Senior Stylist' },
    { rank: 2, name: 'Emily R.', points: 3800, role: 'Stylist' },
    { rank: 3, name: 'Jessica T.', points: 3150, role: 'Front Desk' },
    { rank: 4, name: 'Amanda P.', points: 2900, role: 'Stylist' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="VowOS Training Center & Certification"
        subtitle="Role-based guided paths, continuous multi-tab tours, hands-on scenario practice, and ElevenLabs voice narration."
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-status-success" /> 100% Isolated Demo Environment
            </span>
          </div>
        }
      />

      {/* Featured Master Tour Banner Card */}
      {masterScenario && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-rose-950 p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary/20 px-3 py-1 text-xs font-semibold text-rose-300 border border-brand-primary/30 mb-3">
                <Compass className="h-3.5 w-3.5" /> Full Application Continuous Master Tour
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
                {masterScenario.name}
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-stone-300 leading-relaxed">
                {masterScenario.description} Take an uninterrupted, voice-guided journey through every single tab, card, ledger, and workflow in VowOS.
              </p>
            </div>
            <button
              data-tour-id="btn-launch-master-tour"
              onClick={() => startScenario(masterScenario.id, 'watch', onNavigate as any)}
              className="inline-flex flex-shrink-0 items-center gap-2 rounded-2xl bg-brand-primary hover:bg-brand-primary-hover px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all transform hover:scale-105"
            >
              <Play className="h-4 w-4 fill-white" /> Launch Master Tour
            </button>
          </div>
        </div>
      )}

      {/* Progress Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Completed Scenarios</p>
            <Trophy className="h-5 w-5 text-status-warning" />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-stone-900">14 / {scenarios.length}</p>
          <div className="mt-3 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-status-warning w-[35%]" />
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Active Role Path</p>
            <GraduationCap className="h-5 w-5 text-brand-primary" />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-stone-900">Bridal Consultant</p>
          <p className="mt-1 text-xs text-stone-500">40 Scenarios Available</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Training Certification</p>
            <Award className="h-5 w-5 text-status-success" />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-status-success">Level 2 Certified</p>
          <p className="mt-1 text-xs text-stone-500">Issued July 2026 · Valid</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Voice Narration</p>
            <Sparkles className="h-5 w-5 text-violet-500" />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-stone-900">ElevenLabs TTS</p>
          <p className="mt-1 text-xs text-stone-500">Synchronized Guided Tours</p>
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div data-tour-id="tabs-training-roles" className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        {(['All', 'Owner', 'Manager', 'Bridal Consultant', 'Payroll Administrator'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setSelectedRoleFilter(r)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              selectedRoleFilter === r
                ? 'bg-brand-primary text-white shadow-sm'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Scenarios Grid */}
          <div data-tour-id="grid-training-scenarios" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredScenarios.map((sc) => (
              <div
                key={sc.id}
                className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-rose-300 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary bg-brand-soft px-2.5 py-1 rounded-full border border-border-subtle">
                      {sc.targetRole}
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">{sc.estimatedMinutes} mins · {sc.difficulty}</span>
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold text-stone-900">{sc.name}</h3>
                  <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">{sc.description}</p>
                </div>

                <div className="mt-5 flex items-center justify-between pt-3 border-t border-stone-100">
                  <span className="text-[11px] text-stone-400">{sc.steps.length} Guided Steps</span>
                  <button
                    onClick={() => startScenario(sc.id, 'watch', onNavigate as any)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover transition-colors shadow-sm"
                  >
                    <Play className="h-3.5 w-3.5 fill-white" /> Start Tour
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Gamification Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
             <div className="bg-stone-50/60 px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                   <Medal className="h-5 w-5 text-status-warning" /> Leaderboard
                </h3>
                <span className="text-xs text-stone-500 font-medium">This Month</span>
             </div>
             <div className="divide-y divide-stone-100 p-2">
                {leaderboard.map((u) => (
                  <div key={u.rank} className="flex items-center justify-between p-3 rounded-lg hover:bg-stone-50 transition-colors">
                    <div className="flex items-center gap-3">
                       <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                         u.rank === 1 ? 'bg-amber-100 text-status-warning' :
                         u.rank === 2 ? 'bg-stone-200 text-stone-700' :
                         u.rank === 3 ? 'bg-orange-100 text-orange-700' :
                         'bg-stone-50 text-stone-400'
                       }`}>
                         {u.rank}
                       </span>
                       <div>
                         <p className="text-sm font-bold text-stone-900">{u.name}</p>
                         <p className="text-[10px] text-stone-500">{u.role}</p>
                       </div>
                    </div>
                    <span className="text-sm font-bold text-status-success">{u.points}</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
             <div className="bg-stone-50/60 px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                   <Award className="h-5 w-5 text-indigo-500" /> Recent Badges
                </h3>
             </div>
             <div className="p-4 flex flex-col gap-3">
                {badges.map((b) => (
                  <div key={b.id} className="flex items-center gap-3">
                     <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                        {b.icon}
                     </div>
                     <div>
                       <p className="text-sm font-bold text-stone-900">{b.name}</p>
                       <p className="text-xs text-stone-500">{b.desc}</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
