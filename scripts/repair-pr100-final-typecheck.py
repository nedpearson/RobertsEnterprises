from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    actual = text.count(old)
    if actual != count:
        raise RuntimeError(f'{path}: expected {count} occurrence(s), found {actual} for {old[:80]!r}')
    p.write_text(text.replace(old, new, count), encoding='utf-8')


# Time clock: keep legacy metadata permissive, normalize at typed UI boundaries.
path = 'apps/marketing/src/components/vowos/TimeClockView.tsx'
replace(path,
    '<LocationBadge id={myMeta.locationId} />',
    '<LocationBadge id={locationById(myMeta.locationId).id} />')
replace(path,
    '<select value={targetLoc} onChange={(e) => setTargetLoc(e.target.value)} className={inputCls}>',
    '<select value={targetLoc} onChange={(e) => setTargetLoc(e.target.value as LocationId)} className={inputCls}>')
replace(path,
    "if (!entry?.note) return { department: 'Bridal Styling', locationId: 'covington', breaks: [], transfers: [] };",
    "if (!entry?.note) return { department: 'Bridal Styling', locationId: 'ido-cov', breaks: [], transfers: [] };")
replace(path,
    "return { department: 'Bridal Styling', locationId: 'covington', breaks: [], transfers: [] };",
    "return { department: 'Bridal Styling', locationId: 'ido-cov', breaks: [], transfers: [] };")

# Fitting room: use the canonical PinterestMatchmakerModal contract.
path = 'apps/marketing/src/features/fitting-room/ConsultantFittingRoomView.tsx'
replace(path,
    '<PinterestMatchmakerModal open={matchmakerOpen} onOpenChange={setMatchmakerOpen} onPullGowns={(gowns) => {',
    '<PinterestMatchmakerModal open={matchmakerOpen} onClose={() => setMatchmakerOpen(false)} brideName={selectedBride} onGownsSelected={(gowns) => {')

# Proper Commerce: demo sync issue must satisfy the persisted issue contract.
path = 'apps/marketing/src/features/proper-commerce/api/properCommerceApi.ts'
replace(path,
    "    attempts: 3,\n  }\n] : [];",
    "    attempts: 3,\n    resolved: false,\n  }\n] : [];")

# Catalog manager consumes movement history for Product 360.
path = 'apps/marketing/src/features/proper-commerce/components/CatalogManager.tsx'
replace(path,
    "import { CatalogProduct, PurchaseMode } from '../types/properCommerceTypes';",
    "import { CatalogProduct, InventoryMovement, PurchaseMode } from '../types/properCommerceTypes';")
replace(path,
    "interface CatalogManagerProps {\n  products: CatalogProduct[];\n  onUpdate: () => void;\n}",
    "interface CatalogManagerProps {\n  products: CatalogProduct[];\n  movements?: InventoryMovement[];\n  onUpdate: () => void;\n}")

# Payroll regression fixture: update it to the canonical workforce/payroll contracts.
path = 'apps/marketing/src/lib/services/test-calculations.ts'
replace(path,
    "import { CompensationProfile, Deduction, Reimbursement, Bonus } from './workforceStore';",
    "import { CompensationProfile, Deduction, Reimbursement, Bonus, TimeEntry } from './workforceStore';")
replace(path,
    "const TEST_PERIOD: OfficialPayrollPeriod = {\n  id: 'pay-test-01',\n  name: 'Test Period July 16 - 31, 2026',\n  startDate: '2026-07-16',\n  endDate: '2026-07-31',\n  payDate: '2026-08-05',\n  status: 'draft'\n};",
    "const TEST_PERIOD: OfficialPayrollPeriod = {\n  id: 'pay-test-01',\n  businessId: 'test-business',\n  name: 'Test Period July 16 - 31, 2026',\n  startDate: '2026-07-16',\n  endDate: '2026-07-31',\n  payDate: '2026-08-05',\n  payFrequency: 'semimonthly',\n  status: 'draft',\n};")
replace(path,
    "  const punches = [\n    {\n      id: 'p-01',\n      staffName: 'Eleanor Vance',\n      clockIn: '2026-07-20T08:00:00.000Z',\n      clockOut: '2026-07-20T18:00:00.000Z',\n      note: '{\"department\":\"Sales\",\"locationId\":\"north\",\"breaks\":[],\"transfers\":[]}'\n    }\n  ];",
    "  const punches: TimeEntry[] = [\n    {\n      id: 'p-01',\n      businessId: 'test-business',\n      employeeId: 'eleanor_vance',\n      employeeName: 'Eleanor Vance',\n      clockIn: '2026-07-20T08:00:00.000Z',\n      clockOut: '2026-07-20T18:00:00.000Z',\n      originalLocationId: 'north',\n      status: 'completed',\n      source: 'web',\n      approved: true,\n      notes: 'Overtime regression fixture',\n    },\n  ];")
replace(path,
    "    comp,\n    punches,\n    deductions,",
    "    comp,\n    punches,\n    [],\n    deductions,")

# Inventory workspace: wire real Proper Commerce data rather than rendering required-prop components empty.
path = 'apps/marketing/src/pages/workspaces/InventoryWorkspace.tsx'
replace(path,
    "import React, { useState } from 'react';",
    "import React, { useCallback, useEffect, useState } from 'react';")
replace(path,
    "import RosterTab from '@/components/vowos/shared/RosterTab';",
    "import RosterTab from '@/components/vowos/shared/RosterTab';\nimport { fetchCatalogProducts, fetchCountSessions, fetchInventoryMovements } from '@/features/proper-commerce/api/properCommerceApi';\nimport type { CatalogProduct, InventoryCountSession, InventoryMovement } from '@/features/proper-commerce/types/properCommerceTypes';")
replace(path,
    "  const { gowns, purchaseOrders } = useVowosData();\n\n  const requested = (searchParams.get('tab') as TabId) || 'inventory';",
    "  const { gowns, purchaseOrders } = useVowosData();\n  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);\n  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);\n  const [countSessions, setCountSessions] = useState<InventoryCountSession[]>([]);\n\n  const refreshCommerce = useCallback(async () => {\n    try {\n      const [products, movements, sessions] = await Promise.all([\n        fetchCatalogProducts(),\n        fetchInventoryMovements(),\n        fetchCountSessions(),\n      ]);\n      setCatalogProducts(products);\n      setInventoryMovements(movements);\n      setCountSessions(sessions);\n    } catch (error) {\n      console.error('Failed to load inventory commerce data:', error);\n    }\n  }, []);\n\n  useEffect(() => {\n    void refreshCommerce();\n  }, [refreshCommerce]);\n\n  const requested = (searchParams.get('tab') as TabId) || 'inventory';")
replace(path,
    "      case 'counts':\n        return <InventoryCountManager />;\n      case 'catalogs':\n        return <CatalogManager />;",
    "      case 'counts':\n        return <InventoryCountManager sessions={countSessions} onUpdate={refreshCommerce} />;\n      case 'catalogs':\n        return <CatalogManager products={catalogProducts} movements={inventoryMovements} onUpdate={refreshCommerce} />;")
replace(path,
    "            filterFn={(g) => g.status === 'Reserved' || g.status === 'Assigned'}",
    "            filterFn={(g) => g.inventoryType === 'Special Order' || /\\b(reserved|assigned)\\b/i.test(g.notes || '')}")

# Reports workspace: preserve the Executive Overview drilldown buttons through canonical route mapping.
path = 'apps/marketing/src/pages/workspaces/ReportsWorkspace.tsx'
replace(path,
    "import { useSearchParams } from 'react-router-dom';",
    "import { useNavigate, useSearchParams } from 'react-router-dom';")
replace(path,
    "import { useModuleResolution } from '@/lib/modules/resolver';",
    "import { useModuleResolution } from '@/lib/modules/resolver';\nimport { VIEW_TO_PATH, ViewKey } from '@/lib/navigation/navigationRegistry';")
replace(path,
    "  const [searchParams, setSearchParams] = useSearchParams();\n  const { resolveFeatureAvailability } = useModuleResolution();",
    "  const [searchParams, setSearchParams] = useSearchParams();\n  const navigate = useNavigate();\n  const { resolveFeatureAvailability } = useModuleResolution();\n  const handleNavigate = (view: ViewKey) => navigate(VIEW_TO_PATH[view] ?? '/today');")
replace(path,
    "      case 'analytics':\n        return <OwnerExecutiveOverview />;",
    "      case 'analytics':\n        return <OwnerExecutiveOverview onNavigate={handleNavigate} />;")

# Normalize trailing whitespace only in files changed by this repair batch.
for filename in [
    'apps/marketing/src/components/vowos/TimeClockView.tsx',
    'apps/marketing/src/features/fitting-room/ConsultantFittingRoomView.tsx',
    'apps/marketing/src/features/proper-commerce/api/properCommerceApi.ts',
    'apps/marketing/src/features/proper-commerce/components/CatalogManager.tsx',
    'apps/marketing/src/lib/services/test-calculations.ts',
    'apps/marketing/src/pages/workspaces/InventoryWorkspace.tsx',
    'apps/marketing/src/pages/workspaces/ReportsWorkspace.tsx',
]:
    p = Path(filename)
    lines = p.read_text(encoding='utf-8').splitlines()
    p.write_text('\n'.join(line.rstrip() for line in lines) + '\n', encoding='utf-8')

print('Final PR100 TypeScript repair batch applied successfully')
