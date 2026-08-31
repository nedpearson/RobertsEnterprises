import { useEffect, useState } from 'react';
import { CreditCard, Loader2, DollarSign, Percent, ShieldCheck } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls } from '@/components/vowos/ui';
import { Switch } from '@vowos/design-system';
import {
  PaymentTaxSettings,
  DEFAULT_PAYMENT_TAX_SETTINGS,
  resolveEffectiveSetting,
  saveScopedSetting,
} from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';
import {
  SurchargeSettings,
  DEFAULT_SURCHARGE,
  fetchSurchargeSettings,
  saveSurchargeSettings,
} from '@/lib/payments';
import { BOOKING_FEE_CENTS, formatCents } from '@/data/vowosData';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';

interface PaymentsSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function PaymentsSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: PaymentsSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Surcharges
  const [surchargeEnabled, setSurchargeEnabled] = useState(DEFAULT_SURCHARGE.enabled);
  const [creditPct, setCreditPct] = useState(String(DEFAULT_SURCHARGE.creditPct));
  const [amexPct, setAmexPct] = useState(String(DEFAULT_SURCHARGE.amexPct));

  // Payment/Tax settings
  const [pmtSettings, setPmtSettings] = useState<PaymentTaxSettings>(DEFAULT_PAYMENT_TAX_SETTINGS);
  const [dbPmtSettings, setDbPmtSettings] = useState<PaymentTaxSettings>(DEFAULT_PAYMENT_TAX_SETTINGS);
  const [dbSurcharge, setDbSurcharge] = useState<SurchargeSettings>(DEFAULT_SURCHARGE);

  const loadSettings = async () => {
    setLoading(true);
    const surchargeData = await fetchSurchargeSettings();
    setSurchargeEnabled(surchargeData.enabled);
    setCreditPct(String(surchargeData.creditPct));
    setAmexPct(String(surchargeData.amexPct));
    setDbSurcharge(surchargeData);

    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<PaymentTaxSettings>(
      'payment_tax_settings',
      'payment_tax_settings',
      { dataPlane },
      DEFAULT_PAYMENT_TAX_SETTINGS
    );
    setPmtSettings(result.value);
    setDbPmtSettings(result.value);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger]);

  const currentSurcharge: SurchargeSettings = {
    enabled: surchargeEnabled,
    creditPct: parseFloat(creditPct) || 0,
    amexPct: parseFloat(amexPct) || 0,
  };

  const isDirty =
    JSON.stringify(pmtSettings) !== JSON.stringify(dbPmtSettings) ||
    JSON.stringify(currentSurcharge) !== JSON.stringify(dbSurcharge);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (reason?: string): Promise<boolean> => {
    setSaving(true);
    
    // Save surcharge
    const surchargeErr = await saveSurchargeSettings(currentSurcharge);
    
    // Save payment / tax settings
    let taxErr: string | null = null;
    try {
      const dataPlane = getActiveDataPlane();
      await saveScopedSetting('payment_tax_settings', 'payment_tax_settings', pmtSettings, { dataPlane }, reason);
    } catch (err: any) {
      taxErr = err.message;
    }

    setSaving(false);

    if (surchargeErr || taxErr) {
      toast({
        title: 'Could not save payment settings',
        description: surchargeErr || taxErr || 'Error occurred.',
        variant: 'destructive',
      });
      return false;
    } else {
      toast({
        title: 'Settings saved',
        description: 'Payment and tax configurations updated successfully.',
      });
      setDbSurcharge(currentSurcharge);
      setDbPmtSettings(pmtSettings);
      return true;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [pmtSettings, surchargeEnabled, creditPct, amexPct]);

  const example = (pct: number) => formatCents(BOOKING_FEE_CENTS + Math.round((BOOKING_FEE_CENTS * pct) / 100));

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading payments settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Surcharge rules - original feature migrated */}
      <SettingsCard
        title="Card processing fees"
        description="Fees added on top of the amount due whenever a customer pays by card (booking fees and invoices)."
        icon={<CreditCard className="h-5 w-5" />}
        enabled={surchargeEnabled}
        onToggleEnabled={setSurchargeEnabled}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField label="Credit / debit cards (%)">
            <div className="relative">
              <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={creditPct}
                onChange={(e) => setCreditPct(e.target.value)}
                className={inputCls}
              />
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              Visa, Mastercard, Discover &amp; non-Amex cards.
            </p>
          </SettingsField>

          <SettingsField label="American Express (%)">
            <div className="relative">
              <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={amexPct}
                onChange={(e) => setAmexPct(e.target.value)}
                className={inputCls}
              />
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              American Express is detected automatically.
            </p>
          </SettingsField>
        </div>

        {surchargeEnabled && (
          <div className="rounded-xl bg-brand-soft/70 p-3.5 text-xs leading-relaxed text-brand-secondary ring-1 ring-focus-ring">
            Example on the {formatCents(BOOKING_FEE_CENTS)} booking fee: a Visa is charged{' '}
            <span className="font-semibold">{example(parseFloat(creditPct) || 0)}</span>, an American
            Express is charged <span className="font-semibold">{example(parseFloat(amexPct) || 0)}</span>.
          </div>
        )}
      </SettingsCard>

      {/* Stripe Connection Panel */}
      <SettingsCard
        title="Stripe Connection"
        description="Verify status of connected Stripe Account."
        icon={<DollarSign className="h-5 w-5" />}
      >
        <div className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-800">Connection Mode</p>
              <p className="text-xs text-stone-500">Card processing is provisioned by the VowOS team during onboarding. Status, webhook health and the connected account id will appear here once the payments connection is linked to this organization.</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-200/70 px-2.5 py-0.5 text-xs font-semibold text-stone-600 ring-1 ring-inset ring-stone-300">
              <ShieldCheck className="h-3 w-3" /> Managed by VowOS
            </span>
          </div>
        </div>
      </SettingsCard>

      {/* Tax Rates Configuration */}
      <SettingsCard
        title="Tax Jurisdiction Rates"
        description="Set tax percentages enforced during checkout at each boutique location."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField label="I Do - Baton Rouge Tax Rate (%)">
            <input
              type="number"
              min="0"
              max="20"
              step="0.01"
              value={pmtSettings.taxRates['ido-br'] || ''}
              onChange={(e) =>
                setPmtSettings({
                  ...pmtSettings,
                  taxRates: { ...pmtSettings.taxRates, 'ido-br': parseFloat(e.target.value) || 0 },
                })
              }
              className={inputCls}
            />
          </SettingsField>

          <SettingsField label="I Do - Covington Tax Rate (%)">
            <input
              type="number"
              min="0"
              max="20"
              step="0.01"
              value={pmtSettings.taxRates['ido-cov'] || ''}
              onChange={(e) =>
                setPmtSettings({
                  ...pmtSettings,
                  taxRates: { ...pmtSettings.taxRates, 'ido-cov': parseFloat(e.target.value) || 0 },
                })
              }
              className={inputCls}
            />
          </SettingsField>

          <SettingsField label="Proper & Co - Baton Rouge Tax Rate (%)">
            <input
              type="number"
              min="0"
              max="20"
              step="0.01"
              value={pmtSettings.taxRates['pc-br'] || ''}
              onChange={(e) =>
                setPmtSettings({
                  ...pmtSettings,
                  taxRates: { ...pmtSettings.taxRates, 'pc-br': parseFloat(e.target.value) || 0 },
                })
              }
              className={inputCls}
            />
          </SettingsField>

          <SettingsField label="Proper & Co - Covington Tax Rate (%)">
            <input
              type="number"
              min="0"
              max="20"
              step="0.01"
              value={pmtSettings.taxRates['pc-cov'] || ''}
              onChange={(e) =>
                setPmtSettings({
                  ...pmtSettings,
                  taxRates: { ...pmtSettings.taxRates, 'pc-cov': parseFloat(e.target.value) || 0 },
                })
              }
              className={inputCls}
            />
          </SettingsField>
        </div>
      </SettingsCard>
    </div>
  );
}
