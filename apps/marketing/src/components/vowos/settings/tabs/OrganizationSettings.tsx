import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building,
  CheckCircle2,
  Globe2,
  MapPin,
  Plus,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { toast } from '@vowos/design-system';
import { supabase } from '@/lib/supabase';
import { inputCls } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';

interface Props {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

type Brand = {
  id?: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
};

type Location = {
  id?: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string | null;
  brand_id?: string | null;
};

type Site = {
  id?: string;
  name: string;
  domain: string;
  provider?: string;
  booking_enabled?: boolean;
  ecommerce_enabled?: boolean;
  inquiry_enabled?: boolean;
  site_type?: string;
  status?: string;
  brand_id?: string;
  location_id?: string;
  notification_email?: string | null;
};

type Structure = {
  organization: {
    name: string;
    legal_name?: string | null;
    website?: string | null;
    support_email?: string | null;
    timezone?: string | null;
    industry?: string | null;
  };
  brands: Brand[];
  locations: Location[];
  sites: Site[];
};

const empty: Structure = {
  organization: { name: '', timezone: 'America/Chicago', industry: 'Bridal retail' },
  brands: [],
  locations: [],
  sites: [],
};

const apiUrl = () => import.meta.env.VITE_API_URL || '';
const bookingUrl = (domain: string) => domain.trim()
  ? `${window.location.origin}/book?site=${encodeURIComponent(domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))}`
  : '';

const secondaryActionCls = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50';
const primaryActionCls = 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-800';

export function OrgSettingsTab({ onDirtyChange, registerSaveRef, resetTrigger }: Props) {
  const [state, setState] = useState<Structure>(empty);
  const [saved, setSaved] = useState<Structure>(empty);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch(`${apiUrl()}/api/organization/structure`, {
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not load organization settings.');
      setState(payload);
      setSaved(JSON.parse(JSON.stringify(payload)));
    } catch (error) {
      toast({
        title: 'Could not load organization settings',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [resetTrigger]);

  const dirty = JSON.stringify(state) !== JSON.stringify(saved);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);

  const save = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch(`${apiUrl()}/api/organization/structure`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token ?? ''}`,
        },
        body: JSON.stringify(state),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not save organization settings.');
      await load();
      toast({
        title: 'Organization structure saved',
        description: 'Brands, locations, websites, and appointment routing are updated.',
      });
      return true;
    } catch (error) {
      toast({
        title: 'Could not save organization settings',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => { registerSaveRef(save); }, [state, registerSaveRef]);

  const update = (key: 'brands' | 'locations' | 'sites', index: number, patch: object) => {
    setState((current) => ({
      ...current,
      [key]: current[key].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openBrandIntegrations = (brand: Brand) => {
    if (!brand.id) {
      toast({ title: 'Save the brand first', description: 'A saved brand is required before connecting integrations.' });
      return;
    }
    window.location.assign(`${window.location.pathname}?tab=integrations&brandId=${encodeURIComponent(brand.id)}`);
  };

  if (loading) {
    return <div className="py-10 text-sm text-stone-500">Loading your organization structure...</div>;
  }

  const selectableBrands = state.brands.filter((brand) => brand.id);
  const selectableLocations = state.locations.filter((location) => location.id);
  const mappedLocationCount = state.locations.filter((location) => Boolean(location.brand_id)).length;
  const mappedSiteCount = state.sites.filter((site) => Boolean(site.brand_id)).length;

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Organization Profile"
        description="Your legal and customer-facing organization details."
        icon={<Building className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField label="Business name">
            <input className={inputCls} value={state.organization.name} onChange={(e) => setState({ ...state, organization: { ...state.organization, name: e.target.value } })} />
          </SettingsField>
          <SettingsField label="Legal entity name">
            <input className={inputCls} value={state.organization.legal_name ?? ''} onChange={(e) => setState({ ...state, organization: { ...state.organization, legal_name: e.target.value } })} />
          </SettingsField>
          <SettingsField label="Primary website">
            <input className={inputCls} placeholder="https://example.com" value={state.organization.website ?? ''} onChange={(e) => setState({ ...state, organization: { ...state.organization, website: e.target.value } })} />
          </SettingsField>
          <SettingsField label="Support email">
            <input className={inputCls} type="email" value={state.organization.support_email ?? ''} onChange={(e) => setState({ ...state, organization: { ...state.organization, support_email: e.target.value } })} />
          </SettingsField>
          <SettingsField label="Timezone">
            <input className={inputCls} value={state.organization.timezone ?? ''} onChange={(e) => setState({ ...state, organization: { ...state.organization, timezone: e.target.value } })} />
          </SettingsField>
          <SettingsField label="Industry">
            <input className={inputCls} value={state.organization.industry ?? ''} onChange={(e) => setState({ ...state, organization: { ...state.organization, industry: e.target.value } })} />
          </SettingsField>
        </div>
      </SettingsCard>

      <div id="brand-command-center">
        <SettingsCard
          title="Brand Command Center"
          description="Manage each customer-facing brand, then drill directly into its stores, websites, appointment routing, and integrations."
          icon={<Store className="h-5 w-5" />}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Brands</p>
              <p className="mt-1 text-2xl font-semibold text-stone-900">{state.brands.length}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Mapped locations</p>
              <p className="mt-1 text-2xl font-semibold text-stone-900">{mappedLocationCount}/{state.locations.length}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Mapped websites</p>
              <p className="mt-1 text-2xl font-semibold text-stone-900">{mappedSiteCount}/{state.sites.length}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {state.brands.map((brand, index) => {
              const brandLocations = brand.id ? state.locations.filter((location) => location.brand_id === brand.id) : [];
              const brandSites = brand.id ? state.sites.filter((site) => site.brand_id === brand.id) : [];
              const shopifySites = brandSites.filter((site) => String(site.provider || '').toUpperCase() === 'SHOPIFY' || site.ecommerce_enabled === true);
              const bookingSites = brandSites.filter((site) => site.booking_enabled === true);
              const isSaved = Boolean(brand.id);

              return (
                <div key={brand.id ?? `draft-${index}`} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt="" className="h-11 w-11 rounded-xl border border-stone-200 object-contain" />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                          <Store className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-stone-900">{brand.name || 'New brand'}</h3>
                        <p className="mt-0.5 text-xs text-stone-500">{isSaved ? 'Saved brand workspace' : 'Draft — save before connecting channels'}</p>
                      </div>
                    </div>
                    {isSaved && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg bg-stone-50 p-2.5 text-center"><div className="text-lg font-semibold text-stone-900">{brandLocations.length}</div><div className="text-[10px] uppercase tracking-wide text-stone-500">Locations</div></div>
                    <div className="rounded-lg bg-stone-50 p-2.5 text-center"><div className="text-lg font-semibold text-stone-900">{brandSites.length}</div><div className="text-[10px] uppercase tracking-wide text-stone-500">Websites</div></div>
                    <div className="rounded-lg bg-stone-50 p-2.5 text-center"><div className="text-lg font-semibold text-stone-900">{shopifySites.length}</div><div className="text-[10px] uppercase tracking-wide text-stone-500">Commerce</div></div>
                    <div className="rounded-lg bg-stone-50 p-2.5 text-center"><div className="text-lg font-semibold text-stone-900">{bookingSites.length}</div><div className="text-[10px] uppercase tracking-wide text-stone-500">Booking</div></div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className={primaryActionCls} onClick={() => scrollToSection(`brand-profile-${index}`)}>Edit brand <ArrowRight className="h-3.5 w-3.5" /></button>
                    <button type="button" className={secondaryActionCls} onClick={() => scrollToSection('locations')}>Locations</button>
                    <button type="button" className={secondaryActionCls} onClick={() => scrollToSection('brand-websites')}>Websites</button>
                    <button type="button" className={secondaryActionCls} onClick={() => openBrandIntegrations(brand)}>Integrations</button>
                  </div>
                </div>
              );
            })}
          </div>

          {state.brands.length === 0 && (
            <div className="mt-5 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
              <Store className="mx-auto h-7 w-7 text-stone-400" />
              <p className="mt-2 text-sm font-semibold text-stone-800">No brands have been configured yet.</p>
              <p className="mt-1 text-xs text-stone-500">Create the customer-facing brands that sit underneath this organization.</p>
            </div>
          )}

          <button
            type="button"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-rose-700"
            onClick={() => {
              setState((current) => ({ ...current, brands: [...current.brands, { name: '' }] }));
              window.setTimeout(() => scrollToSection(`brand-profile-${state.brands.length}`), 0);
            }}
          >
            <Plus className="h-4 w-4" /> Add brand
          </button>
        </SettingsCard>
      </div>

      <div id="brands">
        <SettingsCard
          title="Brand Profiles"
          description="Identity fields used throughout VowOS, connected websites, documents, and integrations."
          icon={<Store className="h-5 w-5" />}
        >
          <div className="space-y-4">
            {state.brands.map((brand, index) => (
              <div id={`brand-profile-${index}`} key={brand.id ?? index} className="grid scroll-mt-24 gap-3 rounded-xl border border-stone-200 p-4 sm:grid-cols-2">
                <SettingsField label="Brand name"><input className={inputCls} value={brand.name} onChange={(e) => update('brands', index, { name: e.target.value })} /></SettingsField>
                <SettingsField label="Logo URL"><input className={inputCls} placeholder="https://..." value={brand.logo_url ?? ''} onChange={(e) => update('brands', index, { logo_url: e.target.value })} /></SettingsField>
                <div className="sm:col-span-2"><SettingsField label="Description"><input className={inputCls} value={brand.description ?? ''} onChange={(e) => update('brands', index, { description: e.target.value })} /></SettingsField></div>
                {brand.id && (
                  <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                    <button type="button" className={secondaryActionCls} onClick={() => scrollToSection('locations')}>Manage locations</button>
                    <button type="button" className={secondaryActionCls} onClick={() => scrollToSection('brand-websites')}>Manage websites</button>
                    <button type="button" className={secondaryActionCls} onClick={() => openBrandIntegrations(brand)}>Manage integrations <ArrowRight className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-rose-700" onClick={() => setState({ ...state, brands: [...state.brands, { name: '' }] })}>
            <Plus className="h-4 w-4" /> Add brand
          </button>
          {state.brands.some((brand) => !brand.id) && <p className="mt-2 text-xs text-amber-700">Save new brands before assigning them to locations, websites, or integrations.</p>}
        </SettingsCard>
      </div>

      <div id="locations" className="scroll-mt-24">
        <SettingsCard
          title="Brand Locations"
          description="Store contacts and the brand responsible for each physical location."
          icon={<MapPin className="h-5 w-5" />}
        >
          <div className="space-y-4">
            {state.locations.map((location, index) => (
              <div key={location.id ?? index} className="grid gap-3 rounded-xl border border-stone-200 p-4 sm:grid-cols-2">
                <SettingsField label="Location name"><input className={inputCls} value={location.name} onChange={(e) => update('locations', index, { name: e.target.value })} /></SettingsField>
                <SettingsField label="Brand"><select className={inputCls} value={location.brand_id ?? ''} onChange={(e) => update('locations', index, { brand_id: e.target.value || null })}><option value="">Organization-level</option>{selectableBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></SettingsField>
                <SettingsField label="Address"><input className={inputCls} value={location.address ?? ''} onChange={(e) => update('locations', index, { address: e.target.value })} /></SettingsField>
                <SettingsField label="Phone"><input className={inputCls} value={location.phone ?? ''} onChange={(e) => update('locations', index, { phone: e.target.value })} /></SettingsField>
                <SettingsField label="Store email"><input className={inputCls} type="email" value={location.email ?? ''} onChange={(e) => update('locations', index, { email: e.target.value })} /></SettingsField>
                <SettingsField label="Timezone"><input className={inputCls} value={location.timezone ?? state.organization.timezone ?? ''} onChange={(e) => update('locations', index, { timezone: e.target.value })} /></SettingsField>
              </div>
            ))}
          </div>
          <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-rose-700" onClick={() => setState({ ...state, locations: [...state.locations, { name: '', timezone: state.organization.timezone }] })}>
            <Plus className="h-4 w-4" /> Add location
          </button>
        </SettingsCard>
      </div>

      <div id="brand-websites" className="scroll-mt-24">
        <SettingsCard
          title="Brand Websites & Appointment Routing"
          description="Map every public website to an exact brand and default location so e-commerce, inquiries, and appointment requests cannot cross brands."
          icon={<Globe2 className="h-5 w-5" />}
        >
          <div className="space-y-5">
            {state.sites.map((site, index) => (
              <div key={site.id ?? index} className="rounded-xl border border-stone-200 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {String(site.provider || '').toUpperCase() === 'SHOPIFY' && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"><ShoppingBag className="h-3 w-3" /> Shopify</span>}
                  {site.booking_enabled && <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">Appointment intake</span>}
                  {site.ecommerce_enabled && <span className="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700">E-commerce</span>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SettingsField label="Website name"><input className={inputCls} value={site.name} onChange={(e) => update('sites', index, { name: e.target.value })} /></SettingsField>
                  <SettingsField label="Website domain"><input className={inputCls} placeholder="bridal.example.com" value={site.domain} onChange={(e) => update('sites', index, { domain: e.target.value })} /></SettingsField>
                  <SettingsField label="Brand"><select className={inputCls} value={site.brand_id ?? ''} onChange={(e) => update('sites', index, { brand_id: e.target.value })}><option value="">Select brand</option>{selectableBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></SettingsField>
                  <SettingsField label="Default appointment location"><select className={inputCls} value={site.location_id ?? ''} onChange={(e) => update('sites', index, { location_id: e.target.value })}><option value="">Select location</option>{selectableLocations.filter((location) => !location.brand_id || location.brand_id === site.brand_id).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></SettingsField>
                  <SettingsField label="Appointment notification email"><input className={inputCls} type="email" placeholder="appointments@example.com" value={site.notification_email ?? ''} onChange={(e) => update('sites', index, { notification_email: e.target.value })} /></SettingsField>
                  <SettingsField label="Website provider"><select className={inputCls} value={site.provider ?? 'CUSTOM'} onChange={(e) => update('sites', index, { provider: e.target.value })}><option value="CUSTOM">Custom website</option><option value="SHOPIFY">Shopify</option><option value="VOWOS_HOSTED">VowOS hosted</option></select></SettingsField>
                </div>
                <label className="mt-4 flex items-center gap-2 text-sm font-medium text-stone-700"><input type="checkbox" checked={site.booking_enabled === true} onChange={(e) => update('sites', index, { booking_enabled: e.target.checked })} /> Enable public appointment requests</label>
                {site.booking_enabled && bookingUrl(site.domain) && (
                  <div className="mt-4 rounded-lg bg-stone-50 p-3">
                    <p className="text-xs font-semibold text-stone-700">Hosted appointment URL</p>
                    <code className="mt-1 block break-all text-xs text-stone-600">{bookingUrl(site.domain)}</code>
                    <button type="button" className="mt-2 text-xs font-semibold text-rose-700" onClick={() => navigator.clipboard.writeText(bookingUrl(site.domain)).then(() => toast({ title: 'Appointment URL copied' }))}>Copy appointment URL</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-rose-700" onClick={() => setState({ ...state, sites: [...state.sites, { name: '', domain: '', provider: 'CUSTOM', booking_enabled: false }] })}>
            <Plus className="h-4 w-4" /> Add brand website
          </button>
        </SettingsCard>
      </div>
    </div>
  );
}
