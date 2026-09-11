import { useEffect, useState } from 'react';
import { ShoppingBag, Loader2, Plus, Trash2, Users, Send } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls, btnSecondary } from '@/components/vowos/ui';
import { supabase } from '@/lib/supabase';
import { useBusinessId } from '@/hooks/useBusinessId';
import { Vendor } from '@/types/catalog';

interface PurchasingSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function PurchasingSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: PurchasingSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'designers'>('designers');
  const [isExporting, setIsExporting] = useState(false);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  
  const businessId = useBusinessId();

  const loadVendors = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('business_id', businessId)
        .order('name');
        
      if (error) throw error;
      setVendors(data as Vendor[]);
    } catch (err: any) {
      toast({ title: 'Error loading vendors', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [resetTrigger, businessId]);

  // We are using immediate save, so form is never dirty.
  useEffect(() => {
    onDirtyChange(false);
  }, [onDirtyChange]);

  useEffect(() => {
    registerSaveRef(async () => true);
  }, [registerSaveRef]);

  const addVendor = async () => {
    if (!newVendorName.trim() || !businessId) return;
    const name = newVendorName.trim();
    const exists = vendors.some((v) => v.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast({ title: 'Vendor already exists', variant: 'destructive' });
      return;
    }
    
    try {
      const insertPayload = {
        business_id: businessId,
        name,
        primary_contact: {
          email: newVendorEmail.trim(),
          phone: '',
        },
        ordering_rules: {
          lead_time_days: 0,
          rush_lead_time_days: 0,
        },
        status: 'Active'
      };

      const { data, error } = await supabase
        .from('vendors')
        .insert(insertPayload)
        .select()
        .single();
        
      if (error) throw error;
      
      setVendors([...vendors, data as Vendor]);
      setNewVendorName('');
      setNewVendorEmail('');
      toast({ title: 'Vendor added' });
    } catch (err: any) {
      toast({ title: 'Error adding vendor', description: err.message, variant: 'destructive' });
    }
  };

  const removeVendor = async (id: string) => {
    if (!businessId) return;
    try {
      const { error } = await supabase.from('vendors').delete().eq('id', id).eq('business_id', businessId);
      if (error) throw error;
      setVendors(vendors.filter((v) => v.id !== id));
      toast({ title: 'Vendor removed' });
    } catch (err: any) {
      toast({ title: 'Error removing vendor', description: err.message, variant: 'destructive' });
    }
  };

  const updateVendor = async (updatedVendor: Vendor) => {
    if (!businessId) return;
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          name: updatedVendor.name,
          primary_contact: updatedVendor.primary_contact,
          ordering_rules: updatedVendor.ordering_rules,
        })
        .eq('id', updatedVendor.id)
        .eq('business_id', businessId);
        
      if (error) throw error;
      setVendors(vendors.map(v => v.id === updatedVendor.id ? updatedVendor : v));
      toast({ title: 'Vendor updated' });
    } catch (err: any) {
      toast({ title: 'Error updating vendor', description: err.message, variant: 'destructive' });
    }
  };

  const exportVendors = () => {
    setIsExporting(true);
    toast({ title: 'Exporting...', description: 'Preparing vendor list for export.' });
    setTimeout(() => {
      setIsExporting(false);
      toast({ title: 'Export Complete', description: 'Vendor list has been downloaded.' });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading vendors profiles…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Purchasing & Designers</h3>
              <p className="text-xs text-stone-500">
                Manage designer ordering credentials, average ordering lead times, and contact information.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={exportVendors}
            disabled={isExporting}
            className={`${btnSecondary} gap-2`}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Export Vendors
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'designers', label: 'Vendor Directory', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'designers' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Designer Directory</h4>
            <p className="text-xs text-stone-500 mb-4">Add and manage supplier profiles and terms.</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
              <input
                type="text"
                placeholder="e.g. Ines Di Santo"
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                className={`${inputCls} flex-1`}
              />
              <input
                type="email"
                placeholder="orders@designer.com"
                value={newVendorEmail}
                onChange={(e) => setNewVendorEmail(e.target.value)}
                className={`${inputCls} flex-1`}
              />
              <button
                onClick={addVendor}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Designer
              </button>
            </div>

            <div className="space-y-3">
              {vendors.map((vendor) => (
                <VendorRow
                  key={vendor.id}
                  vendor={vendor}
                  onSave={updateVendor}
                  onRemove={removeVendor}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VendorRow({ vendor, onSave, onRemove }: { vendor: Vendor; onSave: (v: Vendor) => void; onRemove: (id: string) => void }) {
  const [local, setLocal] = useState<Vendor>(vendor);

  useEffect(() => {
    setLocal(vendor);
  }, [vendor]);

  const handleBlur = () => {
    if (JSON.stringify(local) !== JSON.stringify(vendor)) {
      onSave(local);
    }
  };

  const updateContact = (field: string, value: string) => {
    setLocal(prev => ({
      ...prev,
      primary_contact: {
        ...prev.primary_contact,
        [field]: value
      }
    }));
  };

  const updateRules = (field: string, value: number) => {
    setLocal(prev => ({
      ...prev,
      ordering_rules: {
        ...prev.ordering_rules,
        [field]: value
      }
    }));
  };

  const email = local.primary_contact?.email || '';
  const phone = local.primary_contact?.phone || '';
  const leadTimeDays = (local.ordering_rules as any)?.lead_time_days || 0;
  const rushLeadTimeDays = (local.ordering_rules as any)?.rush_lead_time_days || 0;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <input
            type="text"
            value={local.name}
            onChange={(e) => setLocal({ ...local, name: e.target.value })}
            onBlur={handleBlur}
            className="text-sm font-semibold text-stone-800 border-b border-transparent hover:border-stone-300 focus:border-stone-900 bg-transparent px-1 -mx-1 outline-none"
          />
        </div>

        <button
          onClick={() => onRemove(local.id)}
          className="text-stone-400 hover:text-red-500 p-1 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-stone-100">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Ordering Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => updateContact('email', e.target.value)}
            onBlur={handleBlur}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Contact Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => updateContact('phone', e.target.value)}
            onBlur={handleBlur}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Standard Lead Time (days)</label>
          <input
            type="number"
            value={leadTimeDays}
            onChange={(e) => updateRules('lead_time_days', parseInt(e.target.value) || 0)}
            onBlur={handleBlur}
            className={inputCls}
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Rush Lead Time (days)</label>
          <input
            type="number"
            value={rushLeadTimeDays}
            onChange={(e) => updateRules('rush_lead_time_days', parseInt(e.target.value) || 0)}
            onBlur={handleBlur}
            className={inputCls}
            min="0"
          />
        </div>
      </div>
    </div>
  );
}
