from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1):
    p = Path(path)
    text = p.read_text()
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f"{path}: expected {count} occurrence(s), found {actual}: {old[:100]!r}")
    p.write_text(text.replace(old, new, count))

# Bride 360 uses canonical domain fields.
replace('apps/marketing/src/components/vowos/Bride360View.tsx', 'brideContract.totalCents', 'brideContract.amountCents')
replace('apps/marketing/src/components/vowos/Bride360View.tsx', 'alt.fittingDate', 'alt.nextFitting')
replace('apps/marketing/src/components/vowos/Bride360View.tsx', 'm.preview', 'm.body')

# Command palette result metadata includes the selected customer object.
replace(
    'apps/marketing/src/components/vowos/CommandPaletteModal.tsx',
    "const list: { type: string; id: string; label: string; sub?: string; icon: any; action: () => void }[] = [];",
    "const list: { type: string; id: string; label: string; sub?: string; icon: any; customerObj?: unknown; action: () => void }[] = [];",
)

# VowOS data context: expose active business, arbitrary lead-stage updates, and return the created customer.
p = 'apps/marketing/src/contexts/VowosDataContext.tsx'
replace(p, "interface VowosDataContextType {\n  brides: Customer[];", "interface VowosDataContextType {\n  businessId?: string;\n  brides: Customer[];")
replace(p, "  addBride: (input: NewBrideInput) => Promise<boolean>;\n  advanceLead: (id: string) => Promise<void>;", "  addBride: (input: NewBrideInput) => Promise<Customer | false>;\n  advanceLead: (id: string) => Promise<void>;\n  updateLeadStage: (id: string, stage: LeadStage) => Promise<boolean>;")
replace(p, "const VowosDataContext = createContext<VowosDataContextType>({\n  brides: [],", "const VowosDataContext = createContext<VowosDataContextType>({\n  businessId: undefined,\n  brides: [],")
replace(p, "  addBride: async () => false,\n  advanceLead: async () => {},", "  addBride: async () => false,\n  advanceLead: async () => {},\n  updateLeadStage: async () => false,")
replace(p, "async (input: NewBrideInput): Promise<boolean> => {", "async (input: NewBrideInput): Promise<Customer | false> => {")
replace(p, "      setBrides((prev) => [newBride, ...prev]);\n      return true;", "      setBrides((prev) => [newBride, ...prev]);\n      return newBride;")
replace(
    p,
    "  const setAppointmentStatus = useCallback(\n",
    "  const updateLeadStage = useCallback(\n    async (id: string, stage: LeadStage): Promise<boolean> => {\n      const lead = leads.find((item) => item.id === id);\n      if (!lead) return false;\n      setLeads((prev) => prev.map((item) => item.id === id ? { ...item, stage } : item));\n      const { error } = await supabase.from('leads').update({ stage }).eq('business_id', activeBizId).eq('id', id);\n      if (error) {\n        setLeads((prev) => prev.map((item) => item.id === id ? lead : item));\n        dbErrorToast('update lead stage', error.message);\n        return false;\n      }\n      return true;\n    },\n    [activeBizId, leads],\n  );\n\n  const setAppointmentStatus = useCallback(\n",
)
replace(p, "      value={{\n        brides: scoped.brides,", "      value={{\n        businessId: activeBizId || undefined,\n        brides: scoped.brides,")
replace(p, "        addBride,\n        advanceLead,", "        addBride,\n        advanceLead,\n        updateLeadStage,")

# Lead conversion uses the canonical Active status created by addBride and receives the created record.
replace('apps/marketing/src/components/vowos/Lead360Modal.tsx', "        stylist: assignedStylist,\n        status: 'Active',\n", "        stylist: assignedStylist,\n")

# Lead booking modal uses its supported defaults.request contract.
replace(
    'apps/marketing/src/components/vowos/LeadsView.tsx',
    "          defaultName={bookLead.name}\n          defaultEmail={bookLead.email}",
    "          defaults={{ request: { customer: { name: bookLead.name, email: bookLead.email } } }}",
)

# Staff role counters include every canonical role.
replace(
    'apps/marketing/src/components/vowos/StaffView.tsx',
    "const c: Record<OrganizationRole, number> = { Owner: 0, Manager: 0, Stylist: 0, 'Front Desk': 0 };",
    "const c: Record<OrganizationRole, number> = { Owner: 0, Admin: 0, Manager: 0, Stylist: 0, 'Front Desk': 0 };",
)

# Time clock location selectors carry LocationId end to end.
p = 'apps/marketing/src/components/vowos/TimeClockView.tsx'
replace(p, "import { LOCATIONS, locationById, formatCents, formatDate } from '@/data/vowosData';", "import { LOCATIONS, LocationId, locationById, formatCents, formatDate } from '@/data/vowosData';")
replace(p, "const [chosenLoc, setChosenLoc] = useState<string>('covington');", "const [chosenLoc, setChosenLoc] = useState<LocationId>('ido-cov');")
replace(p, "const [targetLoc, setTargetLoc] = useState('covington');", "const [targetLoc, setTargetLoc] = useState<LocationId>('ido-cov');")
replace(p, "onChange={(e) => setChosenLoc(e.target.value)}", "onChange={(e) => setChosenLoc(e.target.value as LocationId)}")

# Payroll public type and report components.
replace('apps/marketing/src/lib/services/payrollEngine.ts', "import { assertEntitlement } from './entitlementService';", "import { assertEntitlement } from './entitlementService';\nexport type { OfficialPayrollPeriod } from './workforceStore';")
replace('apps/marketing/src/components/vowos/payroll/PayrollWizard.tsx', "import { PayrollRunResult, OfficialPayrollPeriod } from '@/lib/services/payrollEngine';", "import { PayrollRunResult } from '@/lib/services/payrollEngine';")
replace('apps/marketing/src/components/vowos/payroll/PayrollWizard.tsx', '<LocationPayrollReport run={draftRun} />', '<LocationPayrollReport />')
replace('apps/marketing/src/components/vowos/payroll/PayrollWizard.tsx', '<ConsolidatedPayrollReport run={draftRun} />', '<ConsolidatedPayrollReport />')

# Settings save callback and real location IDs.
replace('apps/marketing/src/components/vowos/settings/SettingsShell.tsx', 'const ok = await saveFnRef.current(reason);', 'const ok = await saveFnRef.current();')
p = 'apps/marketing/src/components/vowos/settings/tabs/BookingSettings.tsx'
replace(p, "feeSettings.locationOverrides?.['north']", "feeSettings.locationOverrides?.['ido-br']", 1)
replace(p, "locationOverrides: { ...feeSettings.locationOverrides, north: val }", "locationOverrides: { ...feeSettings.locationOverrides, 'ido-br': val }")
replace(p, "feeSettings.locationOverrides?.['south']", "feeSettings.locationOverrides?.['pc-br']", 1)
replace(p, "locationOverrides: { ...feeSettings.locationOverrides, south: val }", "locationOverrides: { ...feeSettings.locationOverrides, 'pc-br': val }")
replace(p, 'North Boutique ($)', 'I Do · Baton Rouge ($)')
replace(p, 'South Boutique ($)', 'Proper & Co · Baton Rouge ($)')

# Supabase query builders are PromiseLike, not native Promise objects.
replace(
    'apps/marketing/src/contexts/AuthContext.tsx',
    "async function safe<T>(fn: () => Promise<{data: T | null, error: any}>, fallback: T): Promise<T> {",
    "async function safe<T>(fn: () => PromiseLike<{data: T | null, error: any}>, fallback: T): Promise<T> {",
)

# Catalog vendor lookup remains tenant scoped.
p = 'apps/marketing/src/features/catalog/Vendor360.tsx'
replace(p, 'catalogService.getVendor(vendorId)', 'catalogService.getVendor(businessId, vendorId)')
replace(p, '  }, [vendorId]);', '  }, [businessId, vendorId]);')

# Marketing page uses canonical roles, settings props, and supported booking defaults.
p = 'apps/marketing/src/features/marketing/pages/MarketingPage.tsx'
replace(p, "    if (userRole === 'Sales Manager') return 'lead-pipeline';\n", '')
replace(p, "{activeTab === 'ai-models' && <AIModelSettingsTab />}", "{activeTab === 'ai-models' && <AIModelSettingsTab onDirtyChange={() => {}} registerSaveRef={() => {}} resetTrigger={0} />}")
replace(p, "          defaultName={bookLeadModal.name}\n          defaultEmail={bookLeadModal.email}", "          defaults={{ request: { customer: { name: bookLeadModal.name, email: bookLeadModal.email } } }}")

# Contract tokens must be cryptographically random; never fall back to a shared/mock value.
replace(
    'apps/marketing/src/lib/contractsAlterations.ts',
    "const newToken = () =>\n  typeof crypto !== 'undefined' && 'randomUUID' in crypto\n    ? crypto?.randomUUID() ?? 'mock-uuid'\n    : crypto?.randomUUID() ?? 'mock-uuid';",
    "const newToken = () => {\n  const secureCrypto = globalThis.crypto;\n  if (!secureCrypto || typeof secureCrypto.randomUUID !== 'function') {\n    throw new Error('Secure random UUID generation is unavailable.');\n  }\n  return secureCrypto.randomUUID();\n};",
)

# Module contract and scheduling data-plane narrowing.
replace(
    'apps/marketing/src/lib/modules/moduleRegistry.ts',
    "    entitlementFeatureKey: 'reports.core',\n    defaultEnabled: true,\n  },",
    "    entitlementFeatureKey: 'reports.core',\n    defaultEnabled: true,\n    dependencies: [],\n  },",
)
replace('apps/marketing/src/lib/services/schedulingService.ts', "dataPlane: context?.dataPlane || 'production',", "dataPlane: (context?.dataPlane || 'production') as 'production' | 'demo',")

print('PR100 asserted repair batch applied successfully')
