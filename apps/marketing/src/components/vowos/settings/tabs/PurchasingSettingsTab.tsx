import { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, Loader2, Plus, Trash2, Store, Save } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { catalogService, OperatingBrand, VendorBusinessBrandAssignment } from '@/lib/services/catalogService';
import { useActiveBusinessContext } from '@/lib/services/schedulingService';
import { Vendor } from '@/types/catalog';

interface PurchasingSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: (reason?: string) => Promise<boolean>) => void;
  resetTrigger: number;
}

interface VendorDraft {
  id: string;
  name: string;
  email: string;
  phone: string;
  leadTimeDays: number;
  rushLeadTimeDays: number;
}

const toDraft = (vendor: Vendor): VendorDraft => ({
  id: vendor.id,
  name: vendor.name,
  email: vendor.primary_contact?.email || '',
  phone: vendor.primary_contact?.phone || '',
  leadTimeDays: vendor.ordering_rules?.lead_time_days ??
    (vendor.ordering_rules?.lead_time_weeks ? vendor.ordering_rules.lead_time_weeks * 7 : 120),
  rushLeadTimeDays: vendor.ordering_rules?.rush_lead_time_days ?? 60,
});

export function PurchasingSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: PurchasingSettingsTabProps) {
  const { businessId, loading: contextLoading } = useActiveBusinessContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState<VendorDraft[]>([]);
  const [persistedVendors, setPersistedVendors] = useState<VendorDraft[]>([]);
  const [brands, setBrands] = useState<OperatingBrand[]>([]);
  const [assignments, setAssignments] = useState<VendorBusinessBrandAssignment[]>([]);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const loadData = async () => {
    if (!businessId) {
      if (!contextLoading) setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [vendorRows, brandRows, assignmentRows] = await Promise.all([
        catalogService.getVendors(businessId),
        catalogService.getOperatingBrands(businessId),
        catalogService.getVendorBusinessBrandAssignments(businessId),
      ]);
      const drafts = vendorRows.filter((vendor) => vendor.status !== 'Inactive').map(toDraft);
      setVendors(drafts);
      setPersistedVendors(drafts);
      setBrands(brandRows);
      setAssignments(assignmentRows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load vendor records.';
      toast({ title: 'Could not load vendors', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [businessId, contextLoading, resetTrigger]);

  const isDirty = useMemo(
    () => JSON.stringify(vendors) !== JSON.stringify(persistedVendors),
    [vendors, persistedVendors],
  );

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSave = async (): Promise<boolean> => {
    if (!businessId) {
      toast({ title: 'Business context unavailable', variant: 'destructive' });
      return false;
    }

    setSaving(true);
    try {
      const persistedMap = new Map(persistedVendors.map((vendor) => [vendor.id, vendor]));
      const changed = vendors.filter((vendor) => JSON.stringify(vendor) !== JSON.stringify(persistedMap.get(vendor.id)));

      await Promise.all(changed.map((vendor) => catalogService.updateVendor(businessId, vendor.id, {
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        leadTimeDays: vendor.leadTimeDays,
        rushLeadTimeDays: vendor.rushLeadTimeDays,
        status: 'Active',
      })));

      setPersistedVendors(vendors.map((vendor) => ({ ...vendor })));
      toast({
        title: 'Vendor records saved',
        description: `${changed.length} vendor record${changed.length === 1 ? '' : 's'} persisted to Supabase.`,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save vendor records.';
      toast({ title: 'Could not save vendor records', description: message, variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [vendors, persistedVendors, businessId]);

  const addVendor = async () => {
    if (!businessId || adding) return;
    const name = newVendorName.trim();
    if (!name) {
      toast({ title: 'Designer name is required', variant: 'destructive' });
      return;
    }

    setAdding(true);
    try {
      const created = await catalogService.createVendor(businessId, {
        name,
        email: newVendorEmail.trim(),
        phone: '',
        leadTimeDays: 120,
        rushLeadTimeDays: 60,
      });

      // In an all-locations organization view, a newly created designer is
      // available to all operating brands by default. Owners can unassign any
      // brand immediately below without duplicating the vendor record.
      await Promise.all(
        brands.map((brand) =>
          catalogService.setVendorBusinessBrandAssignment(businessId, created.id, brand.id, true),
        ),
      );

      const draft = toDraft(created);
      setVendors((current) => [...current, draft].sort((a, b) => a.name.localeCompare(b.name)));
      setPersistedVendors((current) => [...current, draft].sort((a, b) => a.name.localeCompare(b.name)));
      setAssignments((current) => [
        ...current,
        ...brands.map((brand) => ({
          id: `${created.id}:${brand.id}`,
          business_id: businessId,
          vendor_id: created.id,
          brand_id: brand.id,
          active: true,
        })),
      ]);
      setNewVendorName('');
      setNewVendorEmail('');
      toast({ title: 'Designer added', description: `${created.name} is now persisted for this organization.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create designer.';
      toast({ title: 'Could not add designer', description: message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const removeVendor = async (id: string) => {
    if (!businessId) return;
    const vendor = vendors.find((row) => row.id === id);
    if (!vendor) return;

    try {
      await catalogService.deactivateVendor(businessId, id);
      setVendors((current) => current.filter((row) => row.id !== id));
      setPersistedVendors((current) => current.filter((row) => row.id !== id));
      setAssignments((current) => current.filter((assignment) => assignment.vendor_id !== id));
      toast({ title: 'Designer deactivated', description: `${vendor.name} was removed from active purchasing without deleting historical catalog records.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to deactivate designer.';
      toast({ title: 'Could not remove designer', description: message, variant: 'destructive' });
    }
  };

  const updateVendor = (id: string, fields: Partial<VendorDraft>) => {
    setVendors((current) => current.map((vendor) => vendor.id === id ? { ...vendor, ...fields } : vendor));
  };

  const isAssigned = (vendorId: string, brandId: string) =>
    assignments.some((assignment) => assignment.vendor_id === vendorId && assignment.brand_id === brandId && assignment.active);

  const toggleBrand = async (vendorId: string, brandId: string) => {
    if (!businessId) return;
    const nextActive = !isAssigned(vendorId, brandId);
    try {
      await catalogService.setVendorBusinessBrandAssignment(businessId, vendorId, brandId, nextActive);
      setAssignments((current) => {
        const without = current.filter((assignment) => !(assignment.vendor_id === vendorId && assignment.brand_id === brandId));
        if (!nextActive) return without;
        return [...without, {
          id: `${vendorId}:${brandId}`,
          business_id: businessId,
          vendor_id: vendorId,
          brand_id: brandId,
          active: true,
        }];
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update brand assignment.';
      toast({ title: 'Could not update brand assignment', description: message, variant: 'destructive' });
    }
  };

  if (loading || contextLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading vendor records…
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        An active organization is required before vendor records can be managed.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Vendor & Designer Management"
        description="Canonical vendor records are stored once per organization and explicitly assigned to each operating brand."
        icon={<ShoppingBag className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="e.g. Ines Di Santo"
              value={newVendorName}
              onChange={(event) => setNewVendorName(event.target.value)}
              className={`${inputCls} flex-1`}
              data-testid="vendor-name-input"
            />
            <input
              type="email"
              placeholder="orders@designer.com"
              value={newVendorEmail}
              onChange={(event) => setNewVendorEmail(event.target.value)}
              className={`${inputCls} flex-1`}
              data-testid="vendor-email-input"
            />
            <button
              type="button"
              onClick={() => void addVendor()}
              disabled={adding}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="add-designer-button"
            >
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add Designer
            </button>
          </div>

          {brands.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
              <span className="font-semibold text-stone-800">Operating brands:</span>{' '}
              {brands.map((brand) => brand.name).join(' · ')}
            </div>
          )}

          <div className="space-y-3">
            {vendors.length === 0 && (
              <div className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
                No active designers are configured for this organization.
              </div>
            )}

            {vendors.map((vendor) => (
              <div key={vendor.id} className="space-y-4 rounded-xl border border-stone-200 bg-white p-4" data-testid={`vendor-card-${vendor.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <input
                    type="text"
                    value={vendor.name}
                    onChange={(event) => updateVendor(vendor.id, { name: event.target.value })}
                    className="min-w-0 flex-1 border-b border-transparent bg-transparent px-1 -mx-1 text-sm font-semibold text-stone-800 outline-none hover:border-stone-300 focus:border-stone-900"
                    aria-label={`Designer name ${vendor.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => void removeVendor(vendor.id)}
                    className="p-1 text-stone-400 hover:text-red-500"
                    aria-label={`Deactivate ${vendor.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {brands.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                    <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      <Store className="h-3.5 w-3.5" /> Available to
                    </span>
                    {brands.map((brand) => {
                      const checked = isAssigned(vendor.id, brand.id);
                      return (
                        <label key={brand.id} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-white text-stone-500'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => void toggleBrand(vendor.id, brand.id)}
                            className="h-3.5 w-3.5 rounded border-stone-300"
                            aria-label={`${vendor.name} available to ${brand.name}`}
                          />
                          {brand.name}
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="grid gap-4 border-t border-stone-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SettingsField label="Ordering Email">
                    <input
                      type="email"
                      value={vendor.email}
                      onChange={(event) => updateVendor(vendor.id, { email: event.target.value })}
                      className={inputCls}
                    />
                  </SettingsField>

                  <SettingsField label="Contact Phone">
                    <input
                      type="text"
                      value={vendor.phone}
                      onChange={(event) => updateVendor(vendor.id, { phone: event.target.value })}
                      className={inputCls}
                    />
                  </SettingsField>

                  <SettingsField label="Standard Lead Time (days)">
                    <input
                      type="number"
                      value={vendor.leadTimeDays}
                      onChange={(event) => updateVendor(vendor.id, { leadTimeDays: Number.parseInt(event.target.value, 10) || 0 })}
                      className={inputCls}
                      min="0"
                    />
                  </SettingsField>

                  <SettingsField label="Rush Lead Time (days)">
                    <input
                      type="number"
                      value={vendor.rushLeadTimeDays}
                      onChange={(event) => updateVendor(vendor.id, { rushLeadTimeDays: Number.parseInt(event.target.value, 10) || 0 })}
                      className={inputCls}
                      min="0"
                    />
                  </SettingsField>
                </div>

                {isDirty && (
                  <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                      <Save className="h-3 w-3" /> Unsaved vendor field changes
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {saving && (
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving vendor records…
            </div>
          )}
        </div>
      </SettingsCard>
    </div>
  );
}
