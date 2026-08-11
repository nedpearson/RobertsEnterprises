import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Store, Clock, Calculator, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OnboardingWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string | null;
  onComplete: () => void;
}

export function OnboardingWizardModal({ open, onOpenChange, businessId, onComplete }: OnboardingWizardModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [locationName, setLocationName] = useState('Main Location');
  const [taxRate, setTaxRate] = useState('8.5');
  const [currency, setCurrency] = useState('USD');
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('18:00');

  const handleNext = async () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      // 1. Create Location
      const { data: locData, error: locError } = await supabase
        .from('locations')
        .insert({
          business_id: businessId,
          name: locationName,
          short_name: locationName.substring(0, 3).toUpperCase(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          status: 'ACTIVE'
        })
        .select()
        .single();

      if (locError) throw locError;

      // 2. Set Default Tax Rate Setting
      const { error: settingsError } = await supabase
        .from('settings')
        .upsert({
          business_id: businessId,
          location_id: locData.id,
          setting_namespace: 'finance',
          setting_key: 'default_tax_rate',
          setting_value: taxRate,
          data_plane: 'vowos'
        });

      if (settingsError) throw settingsError;

      // 3. Mark Onboarding as COMPLETED on the business
      const { error: busError } = await supabase
        .from('businesses')
        .update({ onboarding_status: 'COMPLETED' })
        .eq('id', businessId);
      
      if (busError) throw busError;

      toast.success('Workspace setup complete!');
      onComplete();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Onboarding Error:', err);
      toast.error(err.message || 'Failed to save setup data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Your Workspace Setup</DialogTitle>
          <DialogDescription>
            Step {step} of 4: Let's get the essentials configured.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <div className="flex items-center gap-4 mb-6 text-brand-primary">
                <Store className="h-8 w-8" />
                <h3 className="text-lg font-semibold text-stone-900">Your First Location</h3>
              </div>
              <p className="text-sm text-stone-500 mb-4">Every business needs at least one physical or virtual location to manage inventory and appointments.</p>
              <div className="space-y-2">
                <Label>Location Name</Label>
                <Input 
                  value={locationName} 
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Downtown Boutique"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <div className="flex items-center gap-4 mb-6 text-brand-primary">
                <Clock className="h-8 w-8" />
                <h3 className="text-lg font-semibold text-stone-900">Operating Hours</h3>
              </div>
              <p className="text-sm text-stone-500 mb-4">Set the default opening hours for {locationName}. You can adjust these for specific days later.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Opening Time</Label>
                  <Input 
                    type="time" 
                    value={openingTime} 
                    onChange={(e) => setOpeningTime(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Closing Time</Label>
                  <Input 
                    type="time" 
                    value={closingTime} 
                    onChange={(e) => setClosingTime(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <div className="flex items-center gap-4 mb-6 text-brand-primary">
                <Calculator className="h-8 w-8" />
                <h3 className="text-lg font-semibold text-stone-900">Financial Settings</h3>
              </div>
              <p className="text-sm text-stone-500 mb-4">Configure defaults for invoicing and point of sale.</p>
              
              <div className="space-y-2 mb-4">
                <Label>Default Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Sales Tax Rate (%)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={taxRate} 
                  onChange={(e) => setTaxRate(e.target.value)} 
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-stone-900">You're ready to go!</h3>
              <p className="text-sm text-stone-500">
                You can always add staff members, update your hours, or adjust tax settings in the main Settings area.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between w-full sm:justify-between">
          <Button 
            variant="outline" 
            onClick={() => setStep(step - 1)} 
            disabled={step === 1 || loading}
          >
            Back
          </Button>
          <Button onClick={handleNext} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === 4 ? 'Finish Setup' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
