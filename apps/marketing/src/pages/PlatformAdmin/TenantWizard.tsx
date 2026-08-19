import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, ArrowRight, Building2, UserCircle, Save, CheckCircle2 } from 'lucide-react';
import { PLAN_REGISTRY, ONBOARDING_LEVELS } from '@/data/planRegistry';

const STEPS = [
  'Organization Details',
  'Software Package',
  'Onboarding Level',
  'Businesses / Brands',
  'Locations',
  'Owner & Users',
  'Modules',
  'Settings',
  'Connections',
  'Data Migration',
  'Training',
  'Go-Live Requirements',
  'Review & Create'
];

export default function TenantWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  
  // State for forms
  const [orgData, setOrgData] = useState({ name: '', slug: '', contactEmail: '' });
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedOnboarding, setSelectedOnboarding] = useState<string>('');
  
  const handleCreate = async () => {
    setSaving(true);
    try {
      // In a real implementation this would use a secure RPC.
      // We insert into businesses to create the tenant.
      const { data: newOrg, error } = await supabase.from('businesses').insert({
        name: orgData.name,
        slug: orgData.slug,
        contact_email: orgData.contactEmail,
        status: 'ACTIVE',
        onboarding_status: 'IN_PROGRESS'
      }).select().single();
      
      if (error) throw error;
      
      // Seed subscription
      if (selectedPlan) {
         await supabase.from('organization_subscriptions').insert({
           business_id: newOrg.id,
           plan_id: selectedPlan,
           status: 'ACTIVE'
         });
      }
      
      toast.success('Organization successfully provisioned');
      navigate('/platform/organizations/' + newOrg.id);
    } catch (err: any) {
      toast.error('Failed to create organization: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/platform')}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <div>
          <h1 className="text-2xl font-bold">VowOS Tenant Factory</h1>
          <p className="text-stone-500">Provision a new customer organization</p>
        </div>
      </div>
      
      <div className="flex gap-8">
        <div className="w-64 shrink-0 space-y-1">
          {STEPS.map((step, idx) => (
            <button
              key={step}
              onClick={() => setCurrentStep(idx)}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${currentStep === idx ? 'bg-stone-900 text-white font-medium' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              {idx + 1}. {step}
            </button>
          ))}
        </div>
        
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[currentStep]}</CardTitle>
            </CardHeader>
            <CardContent>
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Organization Name</Label>
                    <Input value={orgData.name} onChange={e => setOrgData({...orgData, name: e.target.value})} placeholder="e.g. Roberts Enterprises" />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug (Internal ID)</Label>
                    <Input value={orgData.slug} onChange={e => setOrgData({...orgData, slug: e.target.value})} placeholder="e.g. roberts-enterprises" />
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Contact Email</Label>
                    <Input value={orgData.contactEmail} onChange={e => setOrgData({...orgData, contactEmail: e.target.value})} placeholder="owner@boutique.com" />
                  </div>
                </div>
              )}
              
              {currentStep === 1 && (
                <div className="space-y-4">
                  <Label>Software Package</Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger><SelectValue placeholder="Select Plan" /></SelectTrigger>
                    <SelectContent>
                      {Object.values(PLAN_REGISTRY).map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>{plan.name} - \/mo</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {currentStep === 2 && (
                <div className="space-y-4">
                  <Label>Onboarding Level</Label>
                  <Select value={selectedOnboarding} onValueChange={setSelectedOnboarding}>
                    <SelectTrigger><SelectValue placeholder="Select Service Level" /></SelectTrigger>
                    <SelectContent>
                      {Object.values(ONBOARDING_LEVELS).map(level => (
                        <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {currentStep > 2 && currentStep < 12 && (
                <div className="py-12 text-center text-stone-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-stone-300" />
                  <p>Configuration panel for {STEPS[currentStep]}</p>
                  <p className="text-sm">Complete form implementation required for E2E validation.</p>
                </div>
              )}
              
              {currentStep === 12 && (
                <div className="space-y-6">
                  <div className="p-4 bg-stone-50 rounded-lg space-y-2 border border-stone-100">
                    <div className="flex justify-between items-center"><span className="text-stone-500">Organization</span><span className="font-medium">{orgData.name || 'Missing'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-stone-500">Plan</span><span className="font-medium">{PLAN_REGISTRY[selectedPlan as keyof typeof PLAN_REGISTRY]?.name || 'Missing'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-stone-500">Onboarding</span><span className="font-medium">{ONBOARDING_LEVELS[selectedOnboarding as keyof typeof ONBOARDING_LEVELS]?.name || 'Missing'}</span></div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" disabled={currentStep === 0} onClick={() => setCurrentStep(c => c - 1)}>Previous</Button>
              {currentStep < STEPS.length - 1 ? (
                <Button onClick={() => setCurrentStep(c => c + 1)}>Next Step <ArrowRight className="h-4 w-4 ml-2" /></Button>
              ) : (
                <Button onClick={handleCreate} disabled={saving || !orgData.name || !selectedPlan || !selectedOnboarding}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Provision Organization
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
