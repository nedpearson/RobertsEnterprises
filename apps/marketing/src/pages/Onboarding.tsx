import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, ArrowLeft, Check, Loader2, Rocket, Building2, Package, Layers, Palette } from 'lucide-react';

export default function Onboarding() {
  const { user, tenant, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [workspace, setWorkspace] = useState({
    businessName: '',
    industry: '',
    slug: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    country: 'US',
    state: '',
    parentId: '',
    websites: ['']
  });

  const [plan, setPlan] = useState('essentials');
  const [modules, setModules] = useState<Record<string, boolean>>({
    dashboard: true, customers: true, calendar: true, communications: true, reports: true
  });
  
  const [branding, setBranding] = useState({
    primaryColor: '#0f172a',
    secondaryColor: '#f1f5f9'
  });

  // Derived state for available modules based on plan
  const planModules: Record<string, string[]> = {
    essentials: ['dashboard', 'customers', 'calendar', 'communications', 'reports'],
    growth: ['dashboard', 'customers', 'calendar', 'communications', 'reports', 'leads', 'marketing', 'sales', 'quotes', 'payments'],
    pro: ['dashboard', 'customers', 'calendar', 'communications', 'reports', 'leads', 'marketing', 'sales', 'quotes', 'payments', 'inventory', 'orders', 'purchasing', 'vendors', 'logistics'],
    enterprise: ['dashboard', 'customers', 'calendar', 'communications', 'reports', 'leads', 'marketing', 'sales', 'quotes', 'payments', 'inventory', 'orders', 'purchasing', 'vendors', 'logistics', 'employees', 'scheduling', 'time_tracking', 'payroll', 'ai_analytics', 'automations', 'integrations', 'multi_location', 'advanced_reporting']
  };

  useEffect(() => {
    // If tenant exists but isn't active/onboarding, or if they finished onboarding, redirect
    if (tenant && tenant.status === 'ACTIVE') {
      navigate('/');
    }
  }, [tenant, navigate]);

  const handleCreateWorkspace = async () => {
    setIsSubmitting(true);
    try {
      let businessId = tenant?.id;

      if (!businessId) {
        // 1. Provision organization (RPC handles creating businesses, memberships, default sub)
        const { data: newBusinessId, error: provisionError } = await supabase.rpc('provision_new_organization', {
          p_organization_type: 'BUSINESS',
          p_legal_name: workspace.businessName,
          p_display_name: workspace.businessName,
          p_slug: workspace.slug || workspace.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          p_industry: workspace.industry,
          p_country: workspace.country,
          p_state: workspace.state,
          p_timezone: workspace.timezone,
          p_parent_id: workspace.parentId || null,
          p_websites: workspace.websites.filter(w => w.trim() !== '')
        });
  
        if (provisionError) throw provisionError;
        businessId = newBusinessId;
      }

      // 2. Update subscription to selected plan
      const { error: subError } = await supabase
        .from('organization_subscriptions')
        .update({ plan_id: plan })
        .eq('business_id', businessId);
      if (subError) throw subError;

      // 3. Save branding
      const { error: brandError } = await supabase
        .from('businesses')
        .update({ 
          primary_color: branding.primaryColor,
          secondary_color: branding.secondaryColor,
          onboarding_status: 'COMPLETE',
          status: 'ACTIVE'
        })
        .eq('id', businessId);
      if (brandError) throw brandError;

      // Force refresh auth context to load the new tenant
      await refreshProfile();
      toast.success('Workspace created successfully!');
      navigate('/');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-3xl w-full">
        {/* Progress Tracker */}
        <div className="mb-8 flex justify-between items-center px-4 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-stone-200 -z-10 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300 ease-in-out" style={{ width: `${((step - 1) / 3) * 100}%` }} />
          </div>
          
          {[
            { id: 1, label: 'Workspace', icon: Building2 },
            { id: 2, label: 'Plan', icon: Package },
            { id: 3, label: 'Modules', icon: Layers },
            { id: 4, label: 'Branding', icon: Palette }
          ].map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-2 bg-stone-50 px-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= s.id ? 'bg-primary text-primary-foreground' : 'bg-stone-200 text-stone-400'}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-medium ${step >= s.id ? 'text-primary' : 'text-stone-400'}`}>{s.label}</span>
            </div>
          ))}
        </div>

        <Card className="shadow-lg border-0 ring-1 ring-black/5">
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Workspace Details</CardTitle>
                <CardDescription>Tell us a bit about your organization.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input 
                    placeholder="Acme Corp" 
                    value={workspace.businessName} 
                    onChange={e => setWorkspace({...workspace, businessName: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Workspace URL</Label>
                  <div className="flex items-center">
                    <Input 
                      placeholder="acme-corp" 
                      value={workspace.slug} 
                      onChange={e => setWorkspace({...workspace, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} 
                      className="rounded-r-none"
                    />
                    <div className="bg-stone-100 border border-l-0 border-input px-3 py-2 rounded-r-md text-sm text-stone-500 whitespace-nowrap">
                      .vowos.bridgebox.ai
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select value={workspace.industry} onValueChange={v => setWorkspace({...workspace, industry: v})}>
                      <SelectTrigger><SelectValue placeholder="Select industry..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="bridal">Bridal & Formalwear</SelectItem>
                        <SelectItem value="services">Professional Services</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>State / Province</Label>
                    <Input placeholder="NY" value={workspace.state} onChange={e => setWorkspace({...workspace, state: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-stone-100 mt-4">
                  <div className="flex justify-between items-center">
                    <Label>Websites</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setWorkspace({...workspace, websites: [...workspace.websites, '']})}
                    >
                      + Add Website
                    </Button>
                  </div>
                  {workspace.websites.map((url, i) => (
                    <div key={i} className="flex gap-2">
                      <Input 
                        placeholder="https://example.com" 
                        value={url} 
                        onChange={e => {
                          const newWebsites = [...workspace.websites];
                          newWebsites[i] = e.target.value;
                          setWorkspace({...workspace, websites: newWebsites});
                        }} 
                      />
                      {workspace.websites.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            const newWebsites = workspace.websites.filter((_, index) => index !== i);
                            setWorkspace({...workspace, websites: newWebsites});
                          }}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-4 border-t border-stone-100">
                  <Label>Parent Organization ID (Optional)</Label>
                  <Input 
                    placeholder="UUID of parent company if this is a child location" 
                    value={workspace.parentId} 
                    onChange={e => setWorkspace({...workspace, parentId: e.target.value})} 
                  />
                  <p className="text-xs text-stone-500">Leave blank if this is a top-level organization.</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleNext} disabled={!workspace.businessName}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </CardFooter>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Choose a Plan</CardTitle>
                <CardDescription>Select the package that fits your needs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all ${plan === 'essentials' ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                    onClick={() => setPlan('essentials')}
                  >
                    <CardHeader>
                      <CardTitle>Essentials</CardTitle>
                      <div className="text-2xl font-bold">$49<span className="text-sm font-normal text-stone-500">/mo</span></div>
                      <CardDescription>Core tools to manage your business.</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card 
                    className={`cursor-pointer transition-all ${plan === 'growth' ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                    onClick={() => setPlan('growth')}
                  >
                    <CardHeader>
                      <CardTitle>Growth</CardTitle>
                      <div className="text-2xl font-bold">$199<span className="text-sm font-normal text-stone-500">/mo</span></div>
                      <CardDescription>Advanced sales and revenue tools.</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card 
                    className={`cursor-pointer transition-all ${plan === 'pro' ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                    onClick={() => setPlan('pro')}
                  >
                    <CardHeader>
                      <CardTitle>Pro</CardTitle>
                      <div className="text-2xl font-bold">$499<span className="text-sm font-normal text-stone-500">/mo</span></div>
                      <CardDescription>Full operational suite.</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card 
                    className={`cursor-pointer transition-all ${plan === 'enterprise' ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                    onClick={() => setPlan('enterprise')}
                  >
                    <CardHeader>
                      <CardTitle>Enterprise</CardTitle>
                      <div className="text-2xl font-bold">Custom</div>
                      <CardDescription>Everything including AI and workforce management.</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={handlePrev}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={handleNext}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </CardFooter>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Configure Modules</CardTitle>
                <CardDescription>Turn on only the features you need to keep your workspace clean.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {planModules[plan]?.map((mod) => (
                    <div key={mod} className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-100">
                      <div>
                        <div className="font-medium capitalize">{mod.replace('_', ' ')}</div>
                        <div className="text-sm text-stone-500">Enable this module for your team.</div>
                      </div>
                      <Switch 
                        checked={modules[mod] ?? false} 
                        onCheckedChange={(c) => setModules({...modules, [mod]: c})}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={handlePrev}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={handleNext}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </CardFooter>
            </>
          )}

          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Set up your company colors.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-4">
                    <Input 
                      type="color" 
                      value={branding.primaryColor} 
                      onChange={e => setBranding({...branding, primaryColor: e.target.value})} 
                      className="w-16 p-1 h-10"
                    />
                    <Input 
                      value={branding.primaryColor} 
                      onChange={e => setBranding({...branding, primaryColor: e.target.value})} 
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-4">
                    <Input 
                      type="color" 
                      value={branding.secondaryColor} 
                      onChange={e => setBranding({...branding, secondaryColor: e.target.value})} 
                      className="w-16 p-1 h-10"
                    />
                    <Input 
                      value={branding.secondaryColor} 
                      onChange={e => setBranding({...branding, secondaryColor: e.target.value})} 
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="p-6 rounded-lg bg-stone-50 border border-stone-200 mt-6">
                  <h4 className="text-sm font-medium mb-4 text-stone-500">Preview</h4>
                  <Button style={{ backgroundColor: branding.primaryColor, color: '#fff' }} className="mr-4">
                    Primary Action
                  </Button>
                  <Button variant="outline" style={{ borderColor: branding.secondaryColor, color: branding.primaryColor }}>
                    Secondary Action
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={handlePrev} disabled={isSubmitting}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={handleCreateWorkspace} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
                  Launch Workspace
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
