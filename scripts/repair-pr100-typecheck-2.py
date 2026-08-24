from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TOUCHED: set[str] = set()


def replace(path: str, old: str, new: str, expected: int = 1) -> None:
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{path}: expected {expected} occurrence(s), found {count}: {old[:160]!r}')
    p.write_text(text.replace(old, new), encoding='utf-8')
    TOUCHED.add(path)
    print(f'patched {path}: {count} replacement(s)')


def regex(path: str, pattern: str, repl: str, expected: int = 1) -> None:
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    next_text, count = re.subn(pattern, repl, text, flags=re.MULTILINE)
    if count != expected:
        raise SystemExit(f'{path}: expected {expected} regex match(es), found {count}: {pattern[:160]!r}')
    p.write_text(next_text, encoding='utf-8')
    TOUCHED.add(path)
    print(f'patched {path}: {count} regex replacement(s)')

# Bride360: canonical status/contract/alteration/message fields.
p = 'apps/marketing/src/components/vowos/Bride360View.tsx'
replace(p, "    if (bride.status === 'Completed') return 8;\n    if (bride.status === 'Archived') return 8;", "    if (bride.status === 'Picked Up') return 8;")
replace(p, 'formatCents(brideContract.totalCents)', 'formatCents(brideContract.amountCents)')
replace(p, 'formatDate(alt.fittingDate)', "alt.nextFitting ? formatDate(alt.nextFitting) : 'Not scheduled'")
replace(p, '{m.preview}', '{m.body}')

# Command palette: result contract does not carry an embedded customer object.
replace('apps/marketing/src/components/vowos/CommandPaletteModal.tsx', '        customerObj: b,\n', '')

# VowOS data context: expose active business, make bride creation return the record,
# and support explicit lead-stage updates with tenant-scoped persistence.
p = 'apps/marketing/src/contexts/VowosDataContext.tsx'
replace(p, '  loading: boolean;\n  refresh: () => Promise<void>;\n  addBride: (input: NewBrideInput) => Promise<boolean>;\n  advanceLead: (id: string) => Promise<void>;', '  businessId: string;\n  loading: boolean;\n  refresh: () => Promise<void>;\n  addBride: (input: NewBrideInput) => Promise<Customer | null>;\n  advanceLead: (id: string) => Promise<void>;\n  updateLeadStage: (id: string, stage: LeadStage) => Promise<void>;')
replace(p, '  loading: true,\n  refresh: async () => {},\n  addBride: async () => false,\n  advanceLead: async () => {},', "  businessId: '',\n  loading: true,\n  refresh: async () => {},\n  addBride: async () => null,\n  advanceLead: async () => {},\n  updateLeadStage: async () => {},")
replace(p, '    async (input: NewBrideInput): Promise<boolean> => {', '    async (input: NewBrideInput): Promise<Customer | null> => {')
replace(p, "        return false;\n      }\n      setBrides((prev) => [newBride, ...prev]);\n      return true;", "        return null;\n      }\n      setBrides((prev) => [newBride, ...prev]);\n      return newBride;", 1)
replace(p, "  const setAppointmentStatus = useCallback(", "  const updateLeadStage = useCallback(\n    async (id: string, stage: LeadStage) => {\n      const previous = leads.find((lead) => lead.id === id);\n      if (!previous) return;\n      setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, stage } : lead)));\n      const { error } = await supabase\n        .from('leads')\n        .update({ stage })\n        .eq('business_id', activeBizId)\n        .eq('id', id);\n      if (error) {\n        setLeads((current) => current.map((lead) => (lead.id === id ? previous : lead)));\n        dbErrorToast('update lead stage', error.message);\n        throw error;\n      }\n    },\n    [activeBizId, leads],\n  );\n\n  const setAppointmentStatus = useCallback(")
replace(p, '        loading,\n        refresh,\n        addBride,\n        advanceLead,', '        businessId: activeBizId,\n        loading,\n        refresh,\n        addBride,\n        advanceLead,\n        updateLeadStage,')

# Lead conversion now uses the returned Customer record and canonical NewBrideInput.
p = 'apps/marketing/src/components/vowos/Lead360Modal.tsx'
replace(p, "        stylist: assignedStylist,\n        status: 'Active',", '        stylist: assignedStylist,')

# Booking modal callers use the current defaults/request contract.
replace('apps/marketing/src/components/vowos/LeadsView.tsx', '          defaultName={bookLead.name}\n          defaultEmail={bookLead.email}', "          defaults={{ request: { customer: { name: bookLead.name, email: bookLead.email } } }}")

# Staff role summary includes the canonical Admin role.
replace('apps/marketing/src/components/vowos/StaffView.tsx', "    const c: Record<OrganizationRole, number> = { Owner: 0, Manager: 0, Stylist: 0, 'Front Desk': 0 };", "    const c: Record<OrganizationRole, number> = { Owner: 0, Admin: 0, Manager: 0, Stylist: 0, 'Front Desk': 0 };")

# Time clock uses real LocationId values instead of obsolete city aliases.
p = 'apps/marketing/src/components/vowos/TimeClockView.tsx'
replace(p, "import { LOCATIONS, locationById, formatCents, formatDate } from '@/data/vowosData';", "import { LOCATIONS, type LocationId, locationById, formatCents, formatDate } from '@/data/vowosData';")
replace(p, '  locationId: string;\n  breaks:', '  locationId: LocationId;\n  breaks:')
replace(p, "  const [activeLocationFilter, setActiveLocationFilter] = useState<string>('covington');", "  const [activeLocationFilter, setActiveLocationFilter] = useState<LocationId>('ido-cov');")
replace(p, "  const [chosenLoc, setChosenLoc] = useState<string>('covington');", "  const [chosenLoc, setChosenLoc] = useState<LocationId>('ido-cov');")
replace(p, "  const [targetLoc, setTargetLoc] = useState('covington');", "  const [targetLoc, setTargetLoc] = useState<LocationId>('ido-cov');")
replace(p, "locationId: 'covington'", "locationId: 'ido-cov'", 2)
replace(p, 'onChange={(e) => setChosenLoc(e.target.value)}', 'onChange={(e) => setChosenLoc(e.target.value as LocationId)}')
replace(p, 'onChange={(e) => setTargetLoc(e.target.value)}', 'onChange={(e) => setTargetLoc(e.target.value as LocationId)}')
replace(p, 'onChange={(e) => setActiveLocationFilter(e.target.value)}', 'onChange={(e) => setActiveLocationFilter(e.target.value as LocationId)}')

# Payroll reports own their data; the wizard should not pass a nonexistent run prop.
p = 'apps/marketing/src/components/vowos/payroll/PayrollWizard.tsx'
replace(p, 'import { PayrollRunResult, OfficialPayrollPeriod } from \'@/lib/services/payrollEngine\';', "import { PayrollRunResult } from '@/lib/services/payrollEngine';")
replace(p, '<LocationPayrollReport run={draftRun} />', '<LocationPayrollReport />')
replace(p, '<ConsolidatedPayrollReport run={draftRun} />', '<ConsolidatedPayrollReport />')

# Settings save functions accept optional audit reasons.
p = 'apps/marketing/src/components/vowos/settings/SettingsShell.tsx'
replace(p, '  const saveFnRef = useRef<(() => Promise<boolean>) | null>(null);', '  const saveFnRef = useRef<((reason?: string) => Promise<boolean>) | null>(null);')
replace(p, '  const registerSaveFn = (fn: () => Promise<boolean>) => {', '  const registerSaveFn = (fn: (reason?: string) => Promise<boolean>) => {')

# Booking fee overrides use canonical four-store location ids.
p = 'apps/marketing/src/components/vowos/settings/tabs/BookingSettings.tsx'
replace(p, "feeSettings.locationOverrides?.['north']", "feeSettings.locationOverrides?.['ido-cov']")
replace(p, 'locationOverrides: { ...feeSettings.locationOverrides, north: val }', "locationOverrides: { ...feeSettings.locationOverrides, 'ido-cov': val }")
replace(p, "feeSettings.locationOverrides?.['south']", "feeSettings.locationOverrides?.['ido-br']")
replace(p, 'locationOverrides: { ...feeSettings.locationOverrides, south: val }', "locationOverrides: { ...feeSettings.locationOverrides, 'ido-br': val }")
replace(p, '>North Boutique ($)<', '>I Do · Covington ($)<')
replace(p, '>South Boutique ($)<', '>I Do · Baton Rouge ($)<')

# Entitlements hook exposes the real tenant preference mutation.
p = 'apps/marketing/src/hooks/useEntitlements.ts'
replace(p, '  const canUse = (featureKey: FeatureKey): boolean =>\n    features?.[featureKey]?.isEffectivelyEnabled ?? false;\n\n  return {', "  const canUse = (featureKey: FeatureKey): boolean =>\n    features?.[featureKey]?.isEffectivelyEnabled ?? false;\n\n  const toggleCustomerFeature = useCallback(async (featureKey: FeatureKey, enabled: boolean) => {\n    if (!tenant?.id) throw new Error('Active organization is required to change a feature.');\n    await entitlementService.setCustomerToggle(tenant.id, featureKey, enabled);\n    await refresh();\n  }, [tenant?.id, refresh]);\n\n  return {")
replace(p, '    canUse,\n    refresh,', '    canUse,\n    toggleCustomerFeature,\n    refresh,')

# Supabase query builders are PromiseLike; do not require full native Promise methods.
replace('apps/marketing/src/contexts/AuthContext.tsx', 'async function safe<T>(fn: () => Promise<{data: T | null, error: any}>, fallback: T): Promise<T> {', 'async function safe<T>(fn: () => PromiseLike<{ data: T | null; error: any }>, fallback: T): Promise<T> {')

# Vendor 360 is tenant-scoped.
p = 'apps/marketing/src/features/catalog/Vendor360.tsx'
replace(p, '      catalogService.getVendor(vendorId).then(vendor => {', '      catalogService.getVendor(businessId, vendorId).then(vendor => {')
replace(p, '  }, [vendorId]);', '  }, [businessId, vendorId]);')

# Pinterest Matchmaker caller uses its real public props.
p = 'apps/marketing/src/features/fitting-room/ConsultantFittingRoomView.tsx'
replace(p, '<PinterestMatchmakerModal open={matchmakerOpen} onOpenChange={setMatchmakerOpen} onPullGowns={(gowns) => {', '<PinterestMatchmakerModal open={matchmakerOpen} onClose={() => setMatchmakerOpen(false)} brideName={selectedBride} onGownsSelected={(gowns) => {')

# AI model settings can be mounted standalone in Growth and still save.
p = 'apps/marketing/src/components/vowos/settings/tabs/AIModelSettingsTab.tsx'
replace(p, "interface AIModelSettingsTabProps {\n  onDirtyChange: (dirty: boolean) => void;\n  registerSaveRef: (saveFn: () => Promise<boolean>) => void;\n  resetTrigger: number;\n}", "interface AIModelSettingsTabProps {\n  onDirtyChange?: (dirty: boolean) => void;\n  registerSaveRef?: (saveFn: (reason?: string) => Promise<boolean>) => void;\n  resetTrigger?: number;\n}")
replace(p, '  onDirtyChange,\n  registerSaveRef,\n  resetTrigger,\n}: AIModelSettingsTabProps) {', "  onDirtyChange,\n  registerSaveRef,\n  resetTrigger = 0,\n}: AIModelSettingsTabProps = {}) {\n  const standalone = !registerSaveRef;")
replace(p, '    onDirtyChange(isDirty);', '    onDirtyChange?.(isDirty);')
replace(p, '    registerSaveRef(handleSave);', '    registerSaveRef?.(handleSave);')
replace(p, '      </div>\n\n    </div>\n  );\n}', "      </div>\n\n      {standalone && isDirty && (\n        <div className=\"flex justify-end\">\n          <button className={btnPrimary} onClick={() => void handleSave()}>Save AI model settings</button>\n        </div>\n      )}\n    </div>\n  );\n}")

# Marketing page uses supported staff roles and current booking defaults.
p = 'apps/marketing/src/features/marketing/pages/MarketingPage.tsx'
replace(p, "    if (userRole === 'Sales Manager') return 'lead-pipeline';\n", '')
replace(p, '          defaultName={bookLeadModal.name}\n          defaultEmail={bookLeadModal.email}', "          defaults={{ request: { customer: { name: bookLeadModal.name, email: bookLeadModal.email } } }}")

# Proper commerce diagnostics/catalog props.
replace('apps/marketing/src/features/proper-commerce/api/properCommerceApi.ts', "    entityType: 'Product',", "    entityType: 'Product' as const,", 1)
p = 'apps/marketing/src/features/proper-commerce/components/CatalogManager.tsx'
replace(p, "import { CatalogProduct, PurchaseMode } from '../types/properCommerceTypes';", "import { CatalogProduct, InventoryMovement, PurchaseMode } from '../types/properCommerceTypes';")
replace(p, 'interface CatalogManagerProps {\n  products: CatalogProduct[];\n  onUpdate: () => void;\n}', 'interface CatalogManagerProps {\n  products: CatalogProduct[];\n  movements?: InventoryMovement[];\n  onUpdate: () => void;\n}')

# Signing tokens must never fall back to a predictable placeholder.
p = 'apps/marketing/src/lib/contractsAlterations.ts'
replace(p, "const newToken = () =>\n  typeof crypto !== 'undefined' && 'randomUUID' in crypto\n    ? crypto?.randomUUID() ?? 'mock-uuid'\n    : crypto?.randomUUID() ?? 'mock-uuid';", "const newToken = (): string => {\n  const cryptoApi = globalThis.crypto;\n  if (!cryptoApi?.randomUUID) {\n    throw new Error('Secure random UUID generation is unavailable.');\n  }\n  return cryptoApi.randomUUID();\n};")

# Every module definition declares dependency semantics explicitly.
replace('apps/marketing/src/lib/modules/moduleRegistry.ts', "    entitlementFeatureKey: 'reports.core',\n    defaultEnabled: true,\n  },", "    entitlementFeatureKey: 'reports.core',\n    defaultEnabled: true,\n    dependencies: [],\n  },")

# Preserve literal data-plane type.
replace('apps/marketing/src/lib/services/schedulingService.ts', "        const dataPlane = authUser?.email === 'demo123@gmail.com' ? 'demo' : 'production';", "        const dataPlane: ActiveBusinessContext['dataPlane'] = authUser?.email === 'demo123@gmail.com' ? 'demo' : 'production';")

# Payroll calculation test imports the period from its source and supplies segments.
p = 'apps/marketing/src/lib/services/test-calculations.ts'
replace(p, "import { calculateEmployeePayroll, OfficialPayrollPeriod } from './payrollEngine';\nimport { CompensationProfile, Deduction, Reimbursement, Bonus } from './workforceStore';", "import { calculateEmployeePayroll } from './payrollEngine';\nimport { CompensationProfile, Deduction, Reimbursement, Bonus, OfficialPayrollPeriod } from './workforceStore';")
replace(p, '    punches,\n    deductions,', '    punches,\n    [],\n    deductions,', 1)

# Gown status supports reservation workflow states used by the inventory workspace.
replace('apps/marketing/src/data/vowosData.ts', "export type GownStatus = 'In Stock' | 'Low Stock' | 'On Order';", "export type GownStatus = 'In Stock' | 'Low Stock' | 'On Order' | 'Reserved' | 'Assigned';")

# Inventory workspace loads the actual Proper Commerce catalog/count data.
p = 'apps/marketing/src/pages/workspaces/InventoryWorkspace.tsx'
replace(p, "import React, { useState } from 'react';", "import React, { useCallback, useEffect, useState } from 'react';")
replace(p, "import RosterTab from '@/components/vowos/shared/RosterTab';", "import RosterTab from '@/components/vowos/shared/RosterTab';\nimport { fetchCatalogProducts, fetchCountSessions, fetchInventoryMovements } from '@/features/proper-commerce/api/properCommerceApi';\nimport type { CatalogProduct, InventoryCountSession, InventoryMovement } from '@/features/proper-commerce/types/properCommerceTypes';")
replace(p, '  const { gowns, purchaseOrders } = useVowosData();\n\n  const requested', "  const { gowns, purchaseOrders } = useVowosData();\n  const [commerceProducts, setCommerceProducts] = useState<CatalogProduct[]>([]);\n  const [countSessions, setCountSessions] = useState<InventoryCountSession[]>([]);\n  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);\n\n  const loadCommerceData = useCallback(async () => {\n    const [products, sessions, movements] = await Promise.all([\n      fetchCatalogProducts(),\n      fetchCountSessions(),\n      fetchInventoryMovements(),\n    ]);\n    setCommerceProducts(products);\n    setCountSessions(sessions);\n    setInventoryMovements(movements);\n  }, []);\n\n  useEffect(() => {\n    void loadCommerceData();\n  }, [loadCommerceData]);\n\n  const requested")
replace(p, '        return <InventoryCountManager />;', '        return <InventoryCountManager sessions={countSessions} onUpdate={loadCommerceData} />;')
replace(p, '        return <CatalogManager />;', '        return <CatalogManager products={commerceProducts} movements={inventoryMovements} onUpdate={loadCommerceData} />;')

# Reports workspace uses the application router for executive drill-downs.
p = 'apps/marketing/src/pages/workspaces/ReportsWorkspace.tsx'
replace(p, "import { useModuleResolution } from '@/lib/modules/resolver';", "import { useModuleResolution } from '@/lib/modules/resolver';\nimport { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';")
replace(p, '  const { resolveFeatureAvailability } = useModuleResolution();', '  const { resolveFeatureAvailability } = useModuleResolution();\n  const { navigateToView } = useApplicationRoute();')
replace(p, '        return <OwnerExecutiveOverview />;', '        return <OwnerExecutiveOverview onNavigate={navigateToView} />;')

# Normalize whitespace only in files touched by this batch.
for name in sorted(TOUCHED):
    path = ROOT / name
    text = path.read_text(encoding='utf-8')
    had_newline = text.endswith(('\n', '\r\n'))
    path.write_text('\n'.join(line.rstrip() for line in text.splitlines()) + ('\n' if had_newline else ''), encoding='utf-8')

print(f'PR100 second repair batch applied to {len(TOUCHED)} files')
