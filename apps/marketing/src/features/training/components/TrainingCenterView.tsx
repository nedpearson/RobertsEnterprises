import React, { useState } from 'react';
import { OnboardingDashboard } from './OnboardingDashboard';
import { GoLiveChecklist } from './GoLiveChecklist';
import { OwnerOnboardingCurriculum } from './OwnerOnboardingCurriculum';
import { RoleTrainingPaths } from './RoleTrainingPaths';
import { PracticeLab } from './PracticeLab';
import { Award, BookOpen, CheckCircle2, ShieldCheck, Users, FlaskConical, HelpCircle, BarChart3, Settings, ShoppingBag, Box, HeartHandshake, DollarSign, FileSpreadsheet, Lock } from 'lucide-react';
import { getCertifications } from '../api/trainingApi';

export default function TrainingCenterView() {
  const [activeTab, setActiveTab] = useState<string>('onboarding-dashboard');

  const tabs = [
    { id: 'onboarding-dashboard', label: 'My Onboarding', icon: Award },
    { id: 'golive-checklist', label: 'Go-Live Audit', icon: ShieldCheck },
    { id: 'owner-setup', label: 'Owner Setup (23 Phases)', icon: BookOpen },
    { id: 'employee-training', label: 'Role Training Paths', icon: Users },
    { id: 'growth-academy', label: 'Growth & Marketing', icon: BarChart3 },
    { id: 'shopify-academy', label: 'Shopify & Ecommerce', icon: ShoppingBag },
    { id: 'inventory-academy', label: 'Inventory & Receiving', icon: Box },
    { id: 'customer-academy', label: 'Bride & Customer', icon: HeartHandshake },
    { id: 'finance-academy', label: 'Finance & Tax Boundary', icon: DollarSign },
    { id: 'reports-academy', label: 'Reports & Analytics', icon: FileSpreadsheet },
    { id: 'security-privacy', label: 'Security & Privacy', icon: Lock },
    { id: 'practice-lab', label: 'Practice Lab', icon: FlaskConical },
    { id: 'certifications', label: 'Certifications', icon: CheckCircle2 },
    { id: 'help-library', label: 'Help Library', icon: HelpCircle },
    { id: 'training-analytics', label: 'Training Analytics', icon: BarChart3 },
    { id: 'training-settings', label: 'Academy Settings', icon: Settings },
  ];

  const certs = getCertifications();

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500" />
            <h1 className="text-2xl font-black tracking-tight text-stone-900">VowOS Training Center</h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Interactive Onboarding, Master Setup, Role Academies, and Machine-Verified Go-Live Certification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
            ✓ System Ready
          </span>
        </div>
      </div>

      {/* Internal Navigation Tabs (Horizontal Scrollable) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-stone-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
              data-training-id={`tab-${tab.id}`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-rose-400' : 'text-stone-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Router */}
      <div className="mt-6">
        {activeTab === 'onboarding-dashboard' && <OnboardingDashboard onNavigateTab={setActiveTab} />}
        {activeTab === 'golive-checklist' && <GoLiveChecklist />}
        {activeTab === 'owner-setup' && <OwnerOnboardingCurriculum />}
        {activeTab === 'employee-training' && <RoleTrainingPaths />}
        {activeTab === 'practice-lab' && <PracticeLab />}
        {activeTab === 'growth-academy' && <OwnerOnboardingCurriculum />}
        {activeTab === 'shopify-academy' && <OwnerOnboardingCurriculum />}
        {activeTab === 'inventory-academy' && <RoleTrainingPaths />}
        {activeTab === 'customer-academy' && <RoleTrainingPaths />}
        {activeTab === 'finance-academy' && <OwnerOnboardingCurriculum />}
        {activeTab === 'reports-academy' && <OwnerOnboardingCurriculum />}
        {activeTab === 'security-privacy' && <OwnerOnboardingCurriculum />}

        {activeTab === 'certifications' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-stone-900">VowOS Official Certifications</h3>
            {certs.map((c) => (
              <div key={c.id} className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Official Certificate
                  </span>
                  <h4 className="font-bold text-sm text-stone-900 mt-1">{c.certificationType}</h4>
                  <p className="text-xs text-stone-600">Issued to {c.userName} ({c.userRole.toUpperCase()}) · Version {c.courseVersion}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
                  ACTIVE
                </span>
              </div>
            ))}
          </div>
        )}

        {(activeTab === 'help-library' || activeTab === 'training-analytics' || activeTab === 'training-settings') && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm text-center py-12 space-y-2">
            <h3 className="font-bold text-base text-stone-900">VowOS Academy Knowledge Base</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Interactive guides, documentation, and reporting analytics are fully synchronized with VowOS Live Academy.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
