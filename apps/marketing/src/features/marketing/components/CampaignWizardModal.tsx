import { useState } from 'react';
import { MarketingBrand, MarketingObjective, MarketingProvider, MarketingCampaign } from '../types/marketingTypes';
import { createCampaign } from '../api/marketingApi';
import { Modal, btnPrimary, btnSecondary } from '@/components/vowos/ui';
import { LocationId, formatCents } from '@/data/vowosData';
import { Sparkles, CheckCircle2, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { toast } from '@vowos/design-system';

interface CampaignWizardModalProps {
  onClose: () => void;
  onCampaignCreated: (camp: MarketingCampaign) => void;
}

export default function CampaignWizardModal({ onClose, onCampaignCreated }: CampaignWizardModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('Fall 2026 Bridal Trunk Show Drive');
  const [description, setDescription] = useState('Promoting boutique fitting appointments for luxury bridal gowns.');
  const [brand, setBrand] = useState<MarketingBrand>('ido');
  const [locations, setLocations] = useState<LocationId[]>(['ido-br', 'ido-cov']);
  const [objective, setObjective] = useState<MarketingObjective>('bridal_appointments');
  const [providers, setProviders] = useState<MarketingProvider[]>(['meta', 'google']);
  const [budgetCents, setBudgetCents] = useState(150000); // $1,500.00
  const [targetAudience, setTargetAudience] = useState('Engaged Women 22-38 within 45 miles of Baton Rouge & Covington');
  const [destinationUrl, setDestinationUrl] = useState('https://robertsenterprises.vowos.com/#booking');

  const handleToggleLocation = (loc: LocationId) => {
    setLocations((prev) => (prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]));
  };

  const handleToggleProvider = (prov: MarketingProvider) => {
    setProviders((prev) => (prev.includes(prov) ? prev.filter((p) => p !== prov) : [...prev, prov]));
  };

  const handleCreate = () => {
    const created = createCampaign({
      name,
      description,
      brand,
      locations,
      objective,
      providers,
      plannedBudgetCents: budgetCents,
      approvedBudgetCents: budgetCents,
      targetAudience,
      destinationUrl,
    });
    toast({ title: 'Campaign Draft Created!', description: `${created.name} is now submitted for approval.` });
    onCampaignCreated(created);
    onClose();
  };

  return (
    <Modal open={true} onClose={onClose} title={`Guided Campaign Builder — Step ${step} of 5`}>
      <div className="space-y-5 max-w-xl select-none">
        {/* Step Indicator */}
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${step >= s ? 'bg-brand-primary' : 'bg-stone-200'}`}
            />
          ))}
        </div>

        {/* Step 1: Goal & Brand */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-bold text-stone-900 text-sm">Step 1: Campaign Objective &amp; Brand Scoping</h3>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-stone-700">Campaign Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white p-2.5 font-bold text-stone-900 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Target Brand</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value as MarketingBrand)}
                  className="w-full rounded-xl border border-stone-300 bg-white p-2.5 font-bold text-stone-900 focus:outline-none"
                >
                  <option value="ido">I Do Bridal Couture</option>
                  <option value="proper">Proper &amp; Co. Boutique</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Primary Objective</label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as MarketingObjective)}
                  className="w-full rounded-xl border border-stone-300 bg-white p-2.5 font-bold text-stone-900 focus:outline-none"
                >
                  <option value="bridal_appointments">Book Bridal Consultations</option>
                  <option value="promote_new_arrivals">Promote New Arrivals</option>
                  <option value="sell_online">Sell Products Online (Shopify)</option>
                  <option value="trunk_show">Trunk Show / Event Drive</option>
                  <option value="cart_abandonment">Cart Abandonment Retargeting</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Locations & Platforms */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-stone-900 text-sm">Step 2: Authorized Locations &amp; Connected Platforms</h3>

            <div>
              <label className="block font-bold text-stone-700 mb-1.5">Select Boutique Locations</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'ido-br', label: 'I Do Bridal · Baton Rouge' },
                  { id: 'ido-cov', label: 'I Do Bridal · Covington' },
                  { id: 'pc-br', label: 'Proper & Co · Baton Rouge' },
                  { id: 'pc-cov', label: 'Proper & Co · Covington' },
                ].map((loc) => {
                  const selected = locations.includes(loc.id as any);
                  return (
                    <button
                      key={loc.id}
                      onClick={() => handleToggleLocation(loc.id as any)}
                      className={`p-2.5 rounded-xl border font-bold text-left transition-all ${
                        selected ? 'border-brand-primary bg-brand-soft text-brand-secondary' : 'border-stone-200 bg-white text-stone-600'
                      }`}
                    >
                      {loc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1.5">Connected Ad Platforms</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'meta', label: 'Meta (Facebook & Instagram)' },
                  { id: 'google', label: 'Google Ads & Search' },
                  { id: 'tiktok', label: 'TikTok Marketing' },
                  { id: 'pinterest', label: 'Pinterest Ads' },
                ].map((p) => {
                  const selected = providers.includes(p.id as any);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleToggleProvider(p.id as any)}
                      className={`p-2.5 rounded-xl border font-bold text-left transition-all ${
                        selected ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Audience & Destination */}
        {step === 3 && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-stone-900 text-sm">Step 3: Audience Targeting &amp; Destination URL</h3>

            <div className="space-y-1.5">
              <label className="block font-bold text-stone-700">Target Audience Definition</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white p-2.5 font-bold text-stone-900 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-stone-700">Destination Landing Page URL</label>
              <input
                type="text"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white p-2.5 font-bold text-stone-900 focus:border-brand-primary focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Step 4: Budget & Caps */}
        {step === 4 && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-stone-900 text-sm">Step 4: Campaign Budget &amp; Hard Spend Cap</h3>

            <div className="space-y-1.5">
              <label className="block font-bold text-stone-700">Approved Campaign Budget ($)</label>
              <input
                type="number"
                step="50"
                value={budgetCents / 100}
                onChange={(e) => setBudgetCents(Math.max(1000, Number(e.target.value) * 100))}
                className="w-full rounded-xl border border-stone-300 bg-white p-2.5 font-bold text-stone-900 focus:border-brand-primary focus:outline-none"
              />
              <p className="text-[11px] text-stone-500">Planned Budget: {formatCents(budgetCents)}</p>
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-stone-900 p-4 text-white space-y-2">
              <h4 className="font-bold text-white text-sm">Campaign Overview &amp; Guardrail Check</h4>
              <p className="text-xs text-stone-300">Name: {name}</p>
              <p className="text-xs text-stone-300">Brand: {brand.toUpperCase()} · Budget: {formatCents(budgetCents)}</p>
              <p className="text-xs text-stone-300">Platforms: {providers.map((p) => p.toUpperCase()).join(', ')}</p>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex justify-between border-t border-stone-100 pt-3">
          <button onClick={step === 1 ? onClose : () => setStep(step - 1)} className={btnSecondary}>
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 5 ? (
            <button onClick={() => setStep(step + 1)} className={btnPrimary}>
              Next Step →
            </button>
          ) : (
            <button onClick={handleCreate} className={btnPrimary}>
              Submit Campaign for Approval
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
