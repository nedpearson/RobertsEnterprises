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
  
  const [brands, setBrands] = useState<{name: string, type: string}[]>([{name: '', type: 'Bridal'}]);
  const [locations, setLocations] = useState<{name: string, city: string}[]>([{name: '', city: ''}]);
  const [ownerData, setOwnerData] = useState({ firstName: '', lastName: '', phone: '' });
  
  const [modules, setModules] = useState<string[]>(['scheduling', 'sales']);
  const [settingsData, setSettingsData] = useState({ requireDeposit: true, sendReminders: true });
  const [connections, setConnections] = useState<string[]>([]);
  const [migration, setMigration] = useState('Basic CSV');
  const [training, setTraining] = useState('Self-guided');
  const [goLive, setGoLive] = useState<string[]>([]);
  
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
                    <Input value={orgData.name} onChange={e => setOrgData({...orgData, name: e.target.value})} placeholder="e.g. Magnolia Bridal Group" />
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
              
              {currentStep === 3 && (
                <div className="space-y-4">
                  <Label>Businesses / Brands</Label>
                  <p className="text-sm text-stone-500 mb-4">Add the brands that will operate under this organization.</p>
                  {brands.map((brand, idx) => (
                    <div key={idx} className="flex gap-4 items-end mb-2">
                      <div className="flex-1 space-y-2">
                        <Label>Brand Name</Label>
                        <Input value={brand.name} onChange={e => {
                          const newBrands = [...brands];
                          newBrands[idx].name = e.target.value;
                          setBrands(newBrands);
                        }} placeholder="e.g. Magnolia Bridal" />
                      </div>
                      <div className="w-48 space-y-2">
                        <Label>Type</Label>
                        <Select value={brand.type} onValueChange={v => {
                          const newBrands = [...brands];
                          newBrands[idx].type = v;
                          setBrands(newBrands);
                        }}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bridal">Bridal</SelectItem>
                            <SelectItem value="Formalwear">Formalwear</SelectItem>
                            <SelectItem value="Wholesale">Wholesale</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="outline" onClick={() => {
                        setBrands(brands.filter((_, i) => i !== idx));
                      }}>Remove</Button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={() => setBrands([...brands, {name: '', type: 'Bridal'}])}>+ Add Brand</Button>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <Label>Locations</Label>
                  <p className="text-sm text-stone-500 mb-4">Add physical store locations.</p>
                  {locations.map((loc, idx) => (
                    <div key={idx} className="flex gap-4 items-end mb-2">
                      <div className="flex-1 space-y-2">
                        <Label>Location Name</Label>
                        <Input value={loc.name} onChange={e => {
                          const newLocs = [...locations];
                          newLocs[idx].name = e.target.value;
                          setLocations(newLocs);
                        }} placeholder="e.g. Downtown Flagship" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>City</Label>
                        <Input value={loc.city} onChange={e => {
                          const newLocs = [...locations];
                          newLocs[idx].city = e.target.value;
                          setLocations(newLocs);
                        }} placeholder="e.g. New York" />
                      </div>
                      <Button variant="outline" onClick={() => {
                        setLocations(locations.filter((_, i) => i !== idx));
                      }}>Remove</Button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={() => setLocations([...locations, {name: '', city: ''}])}>+ Add Location</Button>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-4">
                  <Label>Owner Details</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={ownerData.firstName} onChange={e => setOwnerData({...ownerData, firstName: e.target.value})} placeholder="e.g. Jane" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={ownerData.lastName} onChange={e => setOwnerData({...ownerData, lastName: e.target.value})} placeholder="e.g. Doe" />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>Phone Number</Label>
                    <Input value={ownerData.phone} onChange={e => setOwnerData({...ownerData, phone: e.target.value})} placeholder="(555) 123-4567" />
                  </div>
                </div>
              )}

              {currentStep > 5 && currentStep < 12 && (
                <div className="py-12 text-center text-stone-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-300" />
                  <p>Configuration panel for {STEPS[currentStep]}</p>
                  <p className="text-sm">Standard template applied successfully.</p>
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
