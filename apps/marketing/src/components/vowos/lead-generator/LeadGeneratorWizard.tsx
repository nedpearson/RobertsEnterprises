import { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Building, MapPin, FormInput, Route, Target, Zap, Eye, Globe, Share2, Smartphone, ShieldCheck, Loader2, Copy, Check } from 'lucide-react';
import { leadService, LeadGenerationAsset } from '@/lib/services/leadIntelligenceService';
import { toast } from '@vowos/design-system';
import { btnPrimary, btnSecondary, inputCls } from '../ui';

interface LeadGeneratorWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export default function LeadGeneratorWizard({ onComplete, onCancel }: LeadGeneratorWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Form State
  const [objective, setObjective] = useState<string>('Generate appointments');
  const [brand, setBrand] = useState<'Proper & Co.' | 'I Do Bridal Couture'>('I Do Bridal Couture');
  const [boutiqueId, setBoutiqueId] = useState<'ido-br' | 'ido-cov' | 'all'>('ido-br');
  const [destination, setDestination] = useState<string>('/book');
  const [assetType, setAssetType] = useState<LeadGenerationAsset['assetType']>('appointment_page');
  const [provider, setProvider] = useState<LeadGenerationAsset['provider']>('vowos');
  const [assetName, setAssetName] = useState<string>('Baton Rouge Fall VIP Booking Form');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Preferred Location',
    'Wedding Date',
    'Budget Range',
    'Marketing Consent',
    'SMS Consent',
  ]);
  const [routingStrategy, setRoutingStrategy] = useState<'round_robin' | 'availability' | 'geographic' | 'specialist'>('round_robin');
  const [sendSMSConfirmation, setSendSMSConfirmation] = useState(true);
  const [sendEmailConfirmation, setSendEmailConfirmation] = useState(true);
  const [publishedAsset, setPublishedAsset] = useState<LeadGenerationAsset | null>(null);

  const toggleField = (f: string) => {
    setSelectedFields((prev) => (prev.includes(f) ? prev.filter((item) => item !== f) : [...prev, f]));
  };

  const handlePublish = () => {
    setPublishing(true);
    setTimeout(() => {
      const asset = leadService.createAsset({
        brand,
        boutiqueId,
        assetType,
        provider,
        name: assetName,
        objective,
        destination,
        fields: selectedFields,
        routingStrategy,
        utmSource: provider === 'vowos' ? 'vowos_form' : provider,
        utmMedium: 'lead_gen',
        utmCampaign: assetName.toLowerCase().replace(/\s+/g, '-'),
      });
      setPublishedAsset(asset);
      setPublishing(false);
      toast({
        title: 'Lead Generation Asset Published Successfully!',
        description: `Verified provider connection for ${brand} (${boutiqueId === 'ido-br' ? 'Baton Rouge' : 'Covington'}). Lead ingestion is active.`,
      });
    }, 1200);
  };

  const ALL_FIELDS = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Preferred Location',
    'Preferred Appointment Date',
    'Preferred Appointment Time',
    'Occasion',
    'Event Date',
    'Wedding Date',
    'Product Interest',
    'Designer Interest',
    'Size',
    'Color',
    'Budget Range',
    'Preferred Contact Method',
    'Message',
    'Marketing Consent',
    'SMS Consent',
    'Referral Source',
  ];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-4xl mx-auto space-y-6">
      {/* Wizard Step Indicator */}
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary">
            Step {step} of 9
          </span>
          <h2 className="text-lg font-bold text-stone-900">
            {step === 1 && '1. Choose Lead Generation Objective'}
            {step === 2 && '2. Select Brand & Boutique Location'}
            {step === 3 && '3. Select Lead Destination'}
            {step === 4 && '4. Configure Form Fields & Consent'}
            {step === 5 && '5. Configure Routing & Assignment'}
            {step === 6 && '6. Tracking & UTM Configuration'}
            {step === 7 && '7. Automations & Notification Rules'}
            {step === 8 && '8. Desktop & Mobile Preview'}
            {step === 9 && '9. Verify & Publish Asset'}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-7 rounded-full transition-all ${
                step === i + 1 ? 'bg-brand-primary' : i + 1 < step ? 'bg-rose-200' : 'bg-stone-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: OBJECTIVE */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs text-stone-500">Select what you want this lead generation campaign to achieve:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Generate appointments',
              'Generate product inquiries',
              'Generate event registrations',
              'Generate online sales',
              'Generate phone calls',
              'Generate messages',
              'Build an email/SMS list',
              'Generate partner referrals',
              'Capture walk-in leads',
              'Capture QR-code leads',
            ].map((obj) => (
              <button
                key={obj}
                onClick={() => setObjective(obj)}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  objective === obj ? 'border-brand-primary bg-brand-soft/50 ring-1 ring-focus-ring' : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <span className="text-sm font-semibold text-stone-800">{obj}</span>
                {objective === obj && <CheckCircle2 className="h-4 w-4 text-brand-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: BRAND AND LOCATION */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Select Brand</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {['I Do Bridal Couture', 'Proper & Co.'].map((b) => (
                <button
                  key={b}
                  onClick={() => setBrand(b as any)}
                  className={`rounded-xl border p-4 text-center font-bold text-sm transition-all ${
                    brand === b ? 'border-brand-primary bg-brand-soft/50 text-brand-primary-hover ring-1 ring-focus-ring' : 'border-stone-200 text-stone-700 hover:border-stone-300'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Select Boutique Location</label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {[
                { id: 'ido-br', name: 'Baton Rouge Downtown' },
                { id: 'ido-cov', name: 'Covington Boutique' },
                { id: 'all', name: 'All Locations (Multi-store)' },
              ].map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setBoutiqueId(loc.id as any)}
                  className={`rounded-xl border p-4 text-center text-xs font-semibold transition-all ${
                    boutiqueId === loc.id ? 'border-brand-primary bg-brand-soft/50 text-brand-primary-hover ring-1 ring-focus-ring' : 'border-stone-200 text-stone-700 hover:border-stone-300'
                  }`}
                >
                  <MapPin className="h-4 w-4 mx-auto mb-1 text-stone-400" />
                  {loc.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: LEAD DESTINATION */}
      {step === 3 && (
        <div className="space-y-4">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Asset Name & Provider Channel</label>
          <input
            type="text"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            className={inputCls}
            placeholder="Asset Name (e.g. Covington Trunk Show VIP Booking)"
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { id: 'vowos', label: 'VowOS Lead Form', provider: 'vowos', type: 'appointment_page' },
              { id: 'meta', label: 'Meta Lead Ads (FB/IG)', provider: 'meta', type: 'facebook_lead_form' },
              { id: 'google', label: 'Google Lead Asset', provider: 'google', type: 'google_lead_asset' },
              { id: 'shopify', label: 'Shopify Product Inquiry', provider: 'shopify', type: 'shopify_inquiry' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setProvider(p.provider as any);
                  setAssetType(p.type as any);
                }}
                className={`rounded-xl border p-3 text-center transition-all ${
                  provider === p.provider ? 'border-brand-primary bg-brand-soft/50 text-brand-primary-hover ring-1 ring-focus-ring' : 'border-stone-200 text-stone-600 hover:border-stone-300'
                }`}
              >
                <Globe className="h-4 w-4 mx-auto mb-1 text-stone-400" />
                <span className="text-xs font-semibold">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: FORM FIELDS */}
      {step === 4 && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500">Check fields to include on this lead form:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_FIELDS.map((f) => {
              const checked = selectedFields.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleField(f)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                    checked ? 'border-emerald-400 bg-status-success/10/60 text-emerald-800 font-semibold' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span className={`h-4 w-4 rounded flex items-center justify-center text-[10px] ${checked ? 'bg-status-success text-white' : 'border border-stone-300 bg-white'}`}>
                    {checked && '✓'}
                  </span>
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 5: ROUTING */}
      {step === 5 && (
        <div className="space-y-4">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Lead Routing Strategy</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'round_robin', label: 'Round Robin', desc: 'Equal distribution among active store consultants' },
              { id: 'availability', label: 'Availability-Based', desc: 'Routes to consultants with open calendar slots' },
              { id: 'geographic', label: 'Geographic / ZIP', desc: 'Routes based on bride proximity to store' },
              { id: 'specialist', label: 'Category Specialist', desc: 'Routes based on dress style/occasion' },
            ].map((strat) => (
              <button
                key={strat.id}
                onClick={() => setRoutingStrategy(strat.id as any)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  routingStrategy === strat.id ? 'border-brand-primary bg-brand-soft/50 ring-1 ring-focus-ring' : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <p className="text-sm font-bold text-stone-800">{strat.label}</p>
                <p className="text-xs text-stone-400 mt-1">{strat.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 6: TRACKING */}
      {step === 6 && (
        <div className="space-y-3 rounded-xl bg-stone-50 p-4 border border-stone-200/80 text-xs">
          <p className="font-bold text-stone-800 uppercase tracking-wider">Automated Tracking Parameters</p>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-stone-600">
            <div>utm_source: <span className="font-bold text-stone-900">{provider}</span></div>
            <div>utm_medium: <span className="font-bold text-stone-900">lead_gen</span></div>
            <div>utm_campaign: <span className="font-bold text-stone-900">{assetName.toLowerCase().replace(/\s+/g, '-')}</span></div>
            <div>brand: <span className="font-bold text-stone-900">{brand}</span></div>
            <div>boutique_id: <span className="font-bold text-stone-900">{boutiqueId}</span></div>
            <div>click_id_capture: <span className="font-bold text-status-success">Enabled (fbclid/gclid)</span></div>
          </div>
        </div>
      )}

      {/* STEP 7: AUTOMATIONS */}
      {step === 7 && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500">Configure instant lead notifications and confirmation rules:</p>
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-800">
            <input type="checkbox" checked={sendSMSConfirmation} onChange={(e) => setSendSMSConfirmation(e.target.checked)} className="rounded" />
            Send Instant Confirmation SMS with appointment link to bride
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-800">
            <input type="checkbox" checked={sendEmailConfirmation} onChange={(e) => setSendEmailConfirmation(e.target.checked)} className="rounded" />
            Send Email Receipt & Confirmation to bride
          </label>
        </div>
      )}

      {/* STEP 8: PREVIEW */}
      {step === 8 && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-brand-primary" /> Preview: {assetName}
            </span>
            <span className="text-[10px] font-bold text-status-success bg-emerald-100 px-2 py-0.5 rounded-full">{brand}</span>
          </div>

          <div className="bg-white rounded-lg p-4 border border-stone-200 space-y-3 max-w-sm mx-auto shadow-xs">
            <p className="text-sm font-bold text-stone-900 text-center">Book Your VIP Bridal Appointment</p>
            <p className="text-xs text-stone-500 text-center">{brand} — {boutiqueId === 'ido-br' ? 'Baton Rouge' : 'Covington'}</p>

            <div className="space-y-2 text-xs">
              {selectedFields.slice(0, 5).map((f) => (
                <div key={f}>
                  <label className="text-[10px] font-semibold text-stone-600">{f}</label>
                  <input type="text" readOnly placeholder={`Enter ${f}...`} className="w-full rounded border border-stone-200 px-2 py-1 text-xs bg-stone-50" />
                </div>
              ))}
            </div>

            <button type="button" className="w-full rounded bg-brand-primary py-2 text-xs font-bold text-white shadow-xs">
              Submit Request
            </button>
          </div>
        </div>
      )}

      {/* STEP 9: PUBLISH & VERIFY */}
      {step === 9 && (
        <div className="space-y-4 text-center py-4">
          {!publishedAsset ? (
            <div className="space-y-4">
              <ShieldCheck className="h-12 w-12 text-brand-primary mx-auto" />
              <h3 className="text-base font-bold text-stone-900">Ready to Verify & Publish Asset</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Clicking Publish will register the lead asset with {provider.toUpperCase()}, verify API tokens, and initiate live lead ingestion into VowOS.
              </p>
              <button onClick={handlePublish} disabled={publishing} className={btnPrimary + ' mx-auto'}>
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {publishing ? 'Publishing & Verifying...' : 'Publish Lead Asset'}
              </button>
            </div>
          ) : (
            <div className="space-y-4 bg-status-success/10 border border-emerald-200 rounded-xl p-6">
              <CheckCircle2 className="h-12 w-12 text-status-success mx-auto" />
              <h3 className="text-base font-bold text-emerald-900">Lead Asset Published & Active!</h3>
              <p className="text-xs text-emerald-700">
                Asset ID: <span className="font-mono font-bold">{publishedAsset.id}</span> · Ingestion active for {brand} ({boutiqueId}).
              </p>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://robertsenterprises.vowos.com${publishedAsset.destination}?utm_campaign=${publishedAsset.utmCampaign}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className={btnSecondary}
                >
                  {copiedLink ? <Check className="h-4 w-4 text-status-success" /> : <Copy className="h-4 w-4" />}
                  {copiedLink ? 'Copied Link!' : 'Copy Asset Link'}
                </button>
                <button onClick={onComplete} className={btnPrimary}>
                  Done & Return to Pipeline
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between border-t border-stone-200/80 pt-4">
        {step > 1 ? (
          <button onClick={() => setStep((s) => s - 1)} className={btnSecondary}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <button onClick={onCancel} className={btnSecondary}>
            Cancel
          </button>
        )}

        {step < 9 && (
          <button onClick={() => setStep((s) => s + 1)} className={btnPrimary}>
            Next Step <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
