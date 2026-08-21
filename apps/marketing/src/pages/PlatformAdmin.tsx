import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, CreditCard, Activity, Search, LayoutDashboard, Shield, AlertTriangle, CloudRain, Briefcase, Zap, ShieldAlert, BookOpen, GitCommitHorizontal, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { PlatformDemoToggle } from '@/components/platform/PlatformStates';
import TenantControlCenter from './PlatformAdmin/TenantControlCenter';
import TenantWizard from './PlatformAdmin/TenantWizard';
import { PlatformOrganizations } from './PlatformAdmin/PlatformOrganizations';
import { PlatformCommandCenter } from './PlatformAdmin/PlatformCommandCenter';
import UserDirectory from './PlatformAdmin/UserDirectory';
import SystemHealthView from './PlatformAdmin/SystemHealthView';
import FailedJobsView from './PlatformAdmin/FailedJobsView';
import IncidentsView from './PlatformAdmin/IncidentsView';
import IntegrationsHealthView from './PlatformAdmin/IntegrationsHealthView';
import PlatformAuditView from './PlatformAdmin/PlatformAuditView';
import ReleaseDashboardView from './PlatformAdmin/ReleaseDashboardView';
import PlatformSalesView from './PlatformAdmin/PlatformSalesView';
import DemoAnalyticsView from './platform/DemoAnalyticsView';
import CustomerSuccessWorkspace from './PlatformAdmin/CustomerSuccessWorkspace';
import SupportQueue from './PlatformAdmin/SupportQueue';
import { HeartHandshake, HeadphonesIcon } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { calculatePlatformMRR, SubRecord } from '@/lib/finance/reconciliationEngine';
import { monthlyPriceCentsForPlan } from '@/config/commercialCatalog';

export default function PlatformAdmin() {
  const { userContext, loading, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isProfileLoading = !!session && !userContext;

  useEffect(() => {
    if (!loading && !isProfileLoading) {
      if (!userContext || (userContext.platform_role !== 'PLATFORM_OWNER' && userContext.platform_role !== 'SUPER_ADMIN')) {
        toast.error('Unauthorized access');
        navigate('/login');
      }
    }
  }, [userContext, loading, isProfileLoading, navigate]);

  // Wait for auth and profile to finish loading before making any render decision
  if (loading || isProfileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900" />
      </div>
    );
  }

  if (!userContext || (userContext.platform_role !== 'PLATFORM_OWNER' && userContext.platform_role !== 'SUPER_ADMIN')) return null;

  const navCategories = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Command Center', path: '/platform', icon: <LayoutDashboard className="w-4 h-4" /> },
        { name: 'Organizations', path: '/platform/organizations', icon: <Building2 className="w-4 h-4" /> },
      ]
    },
    {
      title: 'REVENUE',
      items: [
        { name: 'Corporate Sales', path: '/platform/sales', icon: <DollarSign className="w-4 h-4" /> },
        { name: 'Demo Funnel', path: '/platform/demo-analytics', icon: <Users className="w-4 h-4" /> },
      ]
    },
    {
      title: 'CUSTOMERS',
      items: [
        { name: 'User Directory', path: '/platform/users', icon: <Users className="w-4 h-4" /> },
        { name: 'Customer Success', path: '/platform/success', icon: <HeartHandshake className="w-4 h-4" /> },
        { name: 'Support Queue', path: '/platform/support', icon: <HeadphonesIcon className="w-4 h-4" /> },
      ]
    },
    {
      title: 'PLATFORM',
      items: [
        { name: 'System Health', path: '/platform/health', icon: <Activity className="w-4 h-4" /> },
        { name: 'Incidents', path: '/platform/incidents', icon: <AlertTriangle className="w-4 h-4" /> },
        { name: 'Failed Jobs', path: '/platform/jobs', icon: <Briefcase className="w-4 h-4" /> },
        { name: 'Integrations', path: '/platform/integrations', icon: <Zap className="w-4 h-4" /> },
      ]
    },
    {
      title: 'ENGINEERING / GOVERNANCE',
      items: [
        { name: 'Release Dashboard', path: '/platform/releases', icon: <GitCommitHorizontal className="w-4 h-4" /> },
        { name: 'Audit Log', path: '/platform/audit', icon: <BookOpen className="w-4 h-4" /> },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <div className="w-64 bg-stone-900 text-stone-300 flex flex-col">
        <div className="p-6 border-b border-stone-800">
          <h1 className="text-xl font-serif text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-primary" /> VowOS Platform
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-stone-500 mt-2">Operations Center</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-6 px-3">
            {navCategories.map(category => (
              <div key={category.title}>
                <h3 className="px-3 text-[10px] font-bold tracking-wider text-stone-500 uppercase mb-2">{category.title}</h3>
                <ul className="space-y-1">
                  {category.items.map(item => {
                    // Exact match for root, prefix match for others to keep state active
                    const isActive = item.path === '/platform' ? location.pathname === '/platform' : location.pathname.startsWith(item.path);
                    return (
                      <li key={item.path}>
                        <Link 
                          to={item.path}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-stone-800 text-white font-medium' : 'hover:bg-stone-800/50 hover:text-stone-100'}`}
                        >
                          {item.icon}
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <div className="p-4 border-t border-stone-800">
          <Button variant="ghost" className="w-full justify-start text-stone-400 hover:text-white hover:bg-stone-800" onClick={() => navigate('/app')}>
            Exit Operations
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-stone-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-800">
            {navCategories.flatMap(c => c.items).find(i => i.path === location.pathname)?.name || 'Platform Admin'}
          </h2>
          <PlatformDemoToggle />
        </header>
        <main className="p-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<PlatformCommandCenter />} />
            <Route path="/organizations" element={<PlatformOrganizations />} />
            <Route path="/sales" element={<PlatformSalesView />} />
            <Route path="/demo-analytics" element={<DemoAnalyticsView />} />
            <Route path="/success" element={<CustomerSuccessWorkspace />} />
            <Route path="/support" element={<SupportQueue />} />
            <Route path="/health" element={<SystemHealthView />} />
            <Route path="/incidents" element={<IncidentsView />} />
            <Route path="/jobs" element={<FailedJobsView />} />
            <Route path="/integrations" element={<IntegrationsHealthView />} />
            <Route path="/tenant/:tenantId" element={<TenantControlCenter />} />
              <Route path="/organizations/new" element={<TenantWizard />} />
            <Route path="/users" element={<UserDirectory />} />
            <Route path="/releases" element={<ReleaseDashboardView />} />
            <Route path="/audit" element={<PlatformAuditView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

