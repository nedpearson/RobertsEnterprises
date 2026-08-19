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
  const [users, setUsers] = useState<{email: string, role: string}[]>([]);
  
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
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Owner Details</Label>
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
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input value={ownerData.phone} onChange={e => setOwnerData({...ownerData, phone: e.target.value})} placeholder="(555) 123-4567" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Additional Users & Roles</Label>
                    </div>
                    <p className="text-sm text-stone-500 mb-4">Invite staff and assign permissions.</p>
                    
                    {users.map((user, idx) => (
                      <div key={idx} className="flex gap-4 items-end mb-2">
                        <div className="flex-1 space-y-2">
                          <Label>Email Address</Label>
                          <Input value={user.email} onChange={e => {
                            const newUsers = [...users];
                            newUsers[idx].email = e.target.value;
                            setUsers(newUsers);
                          }} placeholder="staff@example.com" />
                        </div>
                        <div className="w-48 space-y-2">
                          <Label>Permission Role</Label>
                          <Select value={user.role} onValueChange={v => {
                            const newUsers = [...users];
                            newUsers[idx].role = v;
                            setUsers(newUsers);
                          }}>
                            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Manager">Manager</SelectItem>
                              <SelectItem value="Staff">Staff</SelectItem>
                              <SelectItem value="Read-Only">Read-Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button variant="outline" onClick={() => {
                          setUsers(users.filter((_, i) => i !== idx));
                        }}>Remove</Button>
                      </div>
                    ))}
                    <Button variant="secondary" onClick={() => setUsers([...users, {email: '', role: 'Staff'}])}>+ Add User</Button>
                  </div>
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-4">
                  <Label>Modules</Label>
                  <p className="text-sm text-stone-500 mb-4">Select the modules enabled for this tenant.</p>
                  <div className="space-y-2">
                    {['Scheduling', 'Sales', 'Inventory', 'Reports', 'Growth'].map(mod => (
                      <div key={mod} className="flex items-center space-x-2 p-2 border rounded hover:bg-stone-50 cursor-pointer" onClick={() => {
                        if (modules.includes(mod)) {
                          setModules(modules.filter(m => m !== mod));
                        } else {
                          setModules([...modules, mod]);
                        }
                      }}>
                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${modules.includes(mod) ? 'bg-stone-900 border-stone-900' : 'border-stone-300'}`}>
                          {modules.includes(mod) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <Label className="cursor-pointer">{mod}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 7 && (
                <div className="space-y-4">
                  <Label>Settings</Label>
                  <p className="text-sm text-stone-500 mb-4">Configure base tenant settings.</p>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Require Deposit</div>
                      <div className="text-sm text-stone-500">Require a deposit for booking appointments</div>
                    </div>
                    <Button variant={settingsData.requireDeposit ? 'default' : 'outline'} onClick={() => setSettingsData({...settingsData, requireDeposit: !settingsData.requireDeposit})}>
                      {settingsData.requireDeposit ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Send Reminders</div>
                      <div className="text-sm text-stone-500">Automatically send SMS/Email reminders</div>
                    </div>
                    <Button variant={settingsData.sendReminders ? 'default' : 'outline'} onClick={() => setSettingsData({...settingsData, sendReminders: !settingsData.sendReminders})}>
                      {settingsData.sendReminders ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 8 && (
                <div className="space-y-4">
                  <Label>Connections</Label>
                  <p className="text-sm text-stone-500 mb-4">Pre-configure third-party integrations.</p>
                  <div className="space-y-2">
                    {['Stripe', 'Twilio', 'Google', 'Meta'].map(conn => (
                      <div key={conn} className="flex items-center space-x-2 p-2 border rounded hover:bg-stone-50 cursor-pointer" onClick={() => {
                        if (connections.includes(conn)) {
                          setConnections(connections.filter(c => c !== conn));
                        } else {
                          setConnections([...connections, conn]);
                        }
                      }}>
                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${connections.includes(conn) ? 'bg-stone-900 border-stone-900' : 'border-stone-300'}`}>
                          {connections.includes(conn) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <Label className="cursor-pointer">{conn}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 9 && (
                <div className="space-y-4">
                  <Label>Data Migration</Label>
                  <p className="text-sm text-stone-500 mb-4">Select the migration path.</p>
                  <Select value={migration} onValueChange={setMigration}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None (Fresh Start)</SelectItem>
                      <SelectItem value="Basic CSV">Basic CSV Import</SelectItem>
                      <SelectItem value="Full Concierge">Full Concierge Migration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {currentStep === 10 && (
                <div className="space-y-4">
                  <Label>Training</Label>
                  <p className="text-sm text-stone-500 mb-4">Select the training package.</p>
                  <Select value={training} onValueChange={setTraining}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Self-guided">Self-guided</SelectItem>
                      <SelectItem value="Group">Group Training</SelectItem>
                      <SelectItem value="1-on-1">1-on-1 Sessions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {currentStep === 11 && (
                <div className="space-y-4">
                  <Label>Go-Live Requirements</Label>
                  <p className="text-sm text-stone-500 mb-4">Select required checklist items before going live.</p>
                  <div className="space-y-2">
                    {['Payment Gateway Verified', 'Custom Domain Active', 'Catalog Imported', 'Users Trained'].map(req => (
                      <div key={req} className="flex items-center space-x-2 p-2 border rounded hover:bg-stone-50 cursor-pointer" onClick={() => {
                        if (goLive.includes(req)) {
                          setGoLive(goLive.filter(r => r !== req));
                        } else {
                          setGoLive([...goLive, req]);
                        }
                      }}>
                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${goLive.includes(req) ? 'bg-stone-900 border-stone-900' : 'border-stone-300'}`}>
                          {goLive.includes(req) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <Label className="cursor-pointer">{req}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {currentStep === 12 && (
                <div className="space-y-6">
                  <div className="p-4 bg-stone-50 rounded-lg space-y-2 border border-stone-100">
                    <div className="flex justify-between items-center"><span className="text-stone-500">Organization</span><span className="font-medium">{orgData.name || 'Missing'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-stone-500">Plan</span><span className="font-medium">{PLAN_REGISTRY[selectedPlan as keyof typeof PLAN_REGISTRY]?.name || 'Missing'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-stone-500">Onboarding</span><span className="font-medium">{ONBOARDING_LEVELS[selectedOnboarding as keyof typeof ONBOARDING_LEVELS]?.name || 'Missing'}</span></div>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-lg space-y-2 border border-stone-100">
                    <div className="flex justify-between items-center"><span className="text-stone-500">Brands</span><span className="font-medium">{brands.filter(b => b.name).length} configured</span></div>
                    <div className="flex justify-between items-center"><span className="text-stone-500">Locations</span><span className="font-medium">{locations.filter(l => l.name).length} configured</span></div>
                    <div className="flex justify-between items-center"><span className="text-stone-500">Owner</span><span className="font-medium">{ownerData.firstName ? `${ownerData.firstName} ${ownerData.lastName}` : 'Missing'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-stone-500">Additional Users</span><span className="font-medium">{users.filter(u => u.email).length} configured</span></div>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-lg space-y-2 border border-stone-100">
                    <div className="flex justify-between items-center"><span className="text-stone-500">Modules</span><span className="font-medium">{modules.length || 0} selected</span></div>
                    <div className="flex justify-between items-center"><span className="text-stone-500">Connections</span><span className="font-medium">{connections.length || 0} selected</span></div>
                    <div className="flex justify-between items-center"><span className="text-stone-500">Migration</span><span className="font-medium">{migration}</span></div>
                    <div className="flex justify-between items-center"><span className="text-stone-500">Training</span><span className="font-medium">{training}</span></div>
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
