import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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

  const [orgDetails, setOrgDetails] = useState({
    legalName: '', dba: '', displayName: '', slug: '', primaryDomain: '',
    primaryContact: { name: '', email: '', phone: '' },
    billingContact: { name: '', email: '', phone: '' },
    address: '', timezone: 'America/New_York', currency: 'USD', locale: 'en-US', industry: 'Bridal'
  });

  const [packageData, setPackageData] = useState({
    plan: 'starter', billingInterval: 'monthly', trialDays: '14', contractTerm: '12',
    discount: '0', isComped: false, locationAllowance: '1', businessAllowance: '1'
  });

  const [onboarding, setOnboarding] = useState({
    tier: 'standard', implementationOwner: '', targetGoLiveDate: ''
  });

  const [brands, setBrands] = useState([{ name: '', displayName: '', type: 'Bridal', website: '', logo: '', category: '' }]);
  const [locations, setLocations] = useState([{ name: '', address: '', phone: '', email: '', timezone: 'America/New_York', hours: '', appointmentCapacity: '10' }]);
  
  const [users, setUsers] = useState({
    owner: { name: '', email: '', phone: '', businessScope: 'ALL', locationScope: 'ALL' },
    additional: [] as { name: string, email: string, phone: string, role: string, businessScope: string, locationScope: string }[]
  });

  const [modules, setModules] = useState<string[]>(['scheduling', 'sales']);
  const [settingsData, setSettingsData] = useState({ requireDeposit: true, sendReminders: true });
  const [connections, setConnections] = useState<string[]>([]);
  const [migration, setMigration] = useState({ source: 'None', recordCounts: '0', requiresMigration: false });
  const [training, setTraining] = useState({ roleAssigns: 'Self-guided' });
  const [goLive, setGoLive] = useState<string[]>([]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const payload = {
        orgDetails,
        package: packageData,
        onboarding,
        brands: brands.filter(b => b.name),
        locations: locations.filter(l => l.name),
        users,
        modules,
        settings: settingsData,
        connections,
        migration,
        training,
        goLiveRequirements: goLive
      };

      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/platform/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Provisioning failed');
      
      toast.success('Organization successfully provisioned');
      navigate('/platform/organizations/' + data.organization_id);
    } catch (err: any) {
      toast.error('Failed to create organization: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="ghost" onClick={() => navigate('/platform/organizations')}>
          ← Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">VowOS Tenant Factory</h1>
          <p className="text-stone-500">Provision a new customer organization</p>
        </div>
      </div>

      <div className="flex gap-8">
        <div className="w-64 shrink-0">
          <div className="space-y-2">
            {STEPS.map((step, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg text-sm transition-colors ${idx === currentStep ? 'bg-stone-900 text-white' : idx < currentStep ? 'text-stone-500 cursor-pointer hover:bg-stone-100' : 'text-stone-400'}`}
                onClick={() => idx < currentStep && setCurrentStep(idx)}
              >
                {idx + 1}. {step}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <Card className="min-h-[500px] flex flex-col bg-stone-50/50">
            <CardHeader>
              <CardTitle>{STEPS[currentStep]}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Legal Name</Label><Input value={orgDetails.legalName} onChange={e => setOrgDetails({...orgDetails, legalName: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Slug</Label><Input value={orgDetails.slug} onChange={e => setOrgDetails({...orgDetails, slug: e.target.value})} /></div>
                  </div>
                  <div className="space-y-2"><Label>Primary Contact Email</Label><Input value={orgDetails.primaryContact.email} onChange={e => setOrgDetails({...orgDetails, primaryContact: {...orgDetails.primaryContact, email: e.target.value}})} /></div>
                  <div className="space-y-2"><Label>Industry</Label><Input value={orgDetails.industry} onChange={e => setOrgDetails({...orgDetails, industry: e.target.value})} /></div>
                </div>
              )}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Plan</Label><Select value={packageData.plan} onValueChange={v => setPackageData({...packageData, plan: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="starter">Starter</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="enterprise">Enterprise</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Trial Days</Label><Input type="number" value={packageData.trialDays} onChange={e => setPackageData({...packageData, trialDays: e.target.value})} /></div>
                </div>
              )}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Tier</Label><Select value={onboarding.tier} onValueChange={v => setOnboarding({...onboarding, tier: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="self">Self-Serve</SelectItem><SelectItem value="standard">Standard</SelectItem><SelectItem value="white-glove">White Glove</SelectItem></SelectContent></Select></div>
                </div>
              )}
              {currentStep === 3 && (
                <div className="space-y-4">
                  {brands.map((b, i) => (
                    <div key={i} className="space-y-2"><Label>Brand Name</Label><Input value={b.name} onChange={e => {const nb=[...brands]; nb[i].name=e.target.value; setBrands(nb);}}/></div>
                  ))}
                  <Button variant="outline" onClick={() => setBrands([...brands, { name: '', displayName: '', type: 'Bridal', website: '', logo: '', category: '' }])}>Add Brand</Button>
                </div>
              )}
              {currentStep === 4 && (
                <div className="space-y-4">
                  {locations.map((l, i) => (
                    <div key={i} className="space-y-2"><Label>Location Name</Label><Input value={l.name} onChange={e => {const nl=[...locations]; nl[i].name=e.target.value; setLocations(nl);}}/></div>
                  ))}
                  <Button variant="outline" onClick={() => setLocations([...locations, { name: '', address: '', phone: '', email: '', timezone: 'America/New_York', hours: '', appointmentCapacity: '10' }])}>Add Location</Button>
                </div>
              )}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <Label>Owner Email</Label><Input value={users.owner.email} onChange={e => setUsers({...users, owner: {...users.owner, email: e.target.value}})} />
                  <Label>Additional Users</Label>
                  {users.additional.map((u, i) => (
                    <div key={i} className="flex gap-2"><Input placeholder="Email" value={u.email} onChange={e => {const nu=[...users.additional]; nu[i].email=e.target.value; setUsers({...users, additional: nu});}} /></div>
                  ))}
                  <Button variant="outline" onClick={() => setUsers({...users, additional: [...users.additional, { name: '', email: '', phone: '', role: 'Staff', businessScope: 'ALL', locationScope: 'ALL' }]})}>Add User</Button>
                </div>
              )}
              {currentStep === 6 && (
                <div className="space-y-4">
                  {['Scheduling', 'Sales', 'Inventory'].map(mod => (
                    <div key={mod} className="flex gap-2"><input type="checkbox" checked={modules.includes(mod)} onChange={e => setModules(e.target.checked ? [...modules, mod] : modules.filter(m => m !== mod))} /> {mod}</div>
                  ))}
                </div>
              )}
              {currentStep === 7 && (
                <div className="space-y-4">
                  <div className="flex gap-2"><input type="checkbox" checked={settingsData.requireDeposit} onChange={e => setSettingsData({...settingsData, requireDeposit: e.target.checked})} /> Require Deposit</div>
                </div>
              )}
              {currentStep === 8 && (
                <div className="space-y-4">
                  {['Stripe', 'Google', 'Meta'].map(conn => (
                    <div key={conn} className="flex gap-2"><input type="checkbox" checked={connections.includes(conn)} onChange={e => setConnections(e.target.checked ? [...connections, conn] : connections.filter(c => c !== conn))} /> {conn}</div>
                  ))}
                </div>
              )}
              {currentStep === 9 && (
                <div className="space-y-4">
                  <Label>Source</Label><Input value={migration.source} onChange={e => setMigration({...migration, source: e.target.value})} />
                </div>
              )}
              {currentStep === 10 && (
                <div className="space-y-4">
                  <Label>Training</Label><Input value={training.roleAssigns} onChange={e => setTraining({...training, roleAssigns: e.target.value})} />
                </div>
              )}
              {currentStep === 11 && (
                <div className="space-y-4">
                  <Label>Requirements</Label><Input placeholder="Add requirement" onKeyDown={e => { if (e.key === 'Enter') setGoLive([...goLive, e.currentTarget.value]); }} />
                  <div>{goLive.map(g => <div key={g}>- {g}</div>)}</div>
                </div>
              )}
              {currentStep === 12 && (
                <div className="space-y-4">
                  <p>Ready to provision {orgDetails.legalName}?</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" disabled={currentStep === 0} onClick={() => setCurrentStep(c => c - 1)}>Previous</Button>
              {currentStep < 12 ? (
                <Button onClick={() => setCurrentStep(c => c + 1)}>Next Step <ArrowRight className="h-4 w-4 ml-2" /></Button>
              ) : (
                <Button onClick={handleCreate} disabled={saving || !orgDetails.legalName || !orgDetails.slug}>
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
