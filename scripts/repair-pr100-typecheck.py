from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace(path: str, old: str, new: str, expected: int = 1) -> None:
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{path}: expected {expected} occurrence(s), found {count}: {old[:120]!r}')
    p.write_text(text.replace(old, new), encoding='utf-8')
    print(f'patched {path}: {count} replacement(s)')

# Bride 360: use the canonical Customer/Invoice/Contract/Alteration/Message contracts.
p = 'apps/marketing/src/components/vowos/Bride360View.tsx'
replace(p,
"    () => (invoices || []).filter((i: any) => i.brideName?.toLowerCase() === bride.name.toLowerCase() || i.brideId === bride.id),",
"    () => (invoices || []).filter((i) => i.customer?.toLowerCase() === bride.name.toLowerCase()),")
replace(p,
"  // Map status to stage index\n  const currentStageIndex = useMemo(() => {\n    if (bride.status === 'Completed') return 8;\n    if (bride.status === 'Archived') return 8;",
"  const selectedGown = brideContract?.gown || bridePOs[0]?.items || '';\n  const brideBudgetCents = brideAppointments.find((appointment) => appointment.budgetCents > 0)?.budgetCents ?? 0;\n\n  // Map status to stage index\n  const currentStageIndex = useMemo(() => {\n    if (bride.status === 'Picked Up') return 8;")
replace(p, "    if (bride.purchasedGown) return 3;", "    if (selectedGown) return 3;")
replace(p,
"  }, [bride, brideAlterations, brideInvoices, brideContract, brideAppointments]);",
"  }, [bride.status, brideAlterations, brideInvoices, brideContract, brideAppointments, selectedGown]);")
replace(p, "{bride.purchasedGown || 'None recorded yet'}", "{selectedGown || 'None recorded yet'}", 2)
replace(p, "${bride.budget || 'N/A'}", "{formatCents(brideBudgetCents)}")
replace(p, "brideInvoices.reduce((a, c) => a + c.totalCents, 0)", "brideInvoices.reduce((a, c) => a + c.amountCents, 0)")
replace(p, "brideInvoices.reduce((a, c) => a + c.balanceCents, 0)", "brideInvoices.reduce((a, c) => a + Math.max(0, c.amountCents - c.paidCents), 0)")
replace(p, "formatCents(brideContract.totalCents)", "formatCents(brideContract.amountCents)")
replace(p, "formatDate(alt.fittingDate)", "alt.nextFitting ? formatDate(alt.nextFitting) : 'Not scheduled'")
replace(p, "{m.preview}", "{m.body}")
replace(p, "{bride.purchasedGown && (", "{selectedGown && (")
replace(p, "Gown Selection Updated: {bride.purchasedGown}", "Gown Selection Updated: {selectedGown}")
replace(p, "budget (${bride.budget}), and venue style", "budget ({formatCents(brideBudgetCents)}), and venue style")

# Dashboard: render the canonical persisted fields, not stale aliases.
p = 'apps/marketing/src/components/vowos/DashboardView.tsx'
replace(p, "      if (inv.paidCents > 0 && inv.date) {", "      if (inv.paidCents > 0) {")
replace(p, "{inv.id} · {inv.brideName}", "{inv.id} · {inv.customer}", 2)
replace(p, "Paid: {formatDate(inv.date)}", "Paid / due date: {formatDate(inv.dueDate)}")
replace(p, "Sample Sz {g.sampleSize}", "Sample Sz {g.size}")
replace(p, "formatCents(g.retailCents)", "formatCents(g.priceCents)")
replace(p, "{selectedAppt.type} · Room: {selectedAppt.room || 'Fitting Suite A'}", "{selectedAppt.type} · Store: {selectedAppt.location}")
replace(p,
"            {selectedAppt.notes && (\n              <div className=\"rounded-xl border border-stone-200 p-3 bg-stone-50\">\n                <span className=\"text-stone-400 font-semibold uppercase text-[10px]\">Stylist Notes</span>\n                <p className=\"text-stone-700 mt-1\">{selectedAppt.notes}</p>\n              </div>\n            )}",
"            {selectedAppt.lookingFor && (\n              <div className=\"rounded-xl border border-stone-200 p-3 bg-stone-50\">\n                <span className=\"text-stone-400 font-semibold uppercase text-[10px]\">Looking For</span>\n                <p className=\"text-stone-700 mt-1\">{selectedAppt.lookingFor}</p>\n              </div>\n            )}")

# Command palette result type does not carry a Customer object; navigation already carries the id.
replace('apps/marketing/src/components/vowos/CommandPaletteModal.tsx', "        customerObj: b,\n", "")

# Contract signing tokens must be cryptographically secure and fail closed.
p = 'apps/marketing/src/lib/contractsAlterations.ts'
replace(p,
"const newToken = () =>\n  typeof crypto !== 'undefined' && 'randomUUID' in crypto\n    ? crypto?.randomUUID() ?? 'mock-uuid'\n    : crypto?.randomUUID() ?? 'mock-uuid';",
"const newToken = (): string => {\n  const cryptoApi = globalThis.crypto;\n  if (!cryptoApi?.randomUUID) {\n    throw new Error('Secure random UUID generation is unavailable.');\n  }\n  return cryptoApi.randomUUID();\n};")

# Settings tabs may accept an optional audit reason when saving.
p = 'apps/marketing/src/components/vowos/settings/SettingsShell.tsx'
replace(p, "  const saveFnRef = useRef<(() => Promise<boolean>) | null>(null);", "  const saveFnRef = useRef<((reason?: string) => Promise<boolean>) | null>(null);")
replace(p, "  const registerSaveFn = (fn: () => Promise<boolean>) => {", "  const registerSaveFn = (fn: (reason?: string) => Promise<boolean>) => {")

# Staff roles: use the canonical RBAC enum end-to-end.
p = 'apps/marketing/src/components/vowos/StaffView.tsx'
replace(p, "  const [addRole, setAddRole] = useState<OrganizationRole>('Stylist');", "  const [addRole, setAddRole] = useState<OrganizationRole>(OrganizationRole.EMPLOYEE);")
replace(p, "  const isOwner = profile?.role === 'Owner';", "  const currentRole = normalizeOrganizationRole(String(profile?.role ?? ''));\n  const isOwner = currentRole === OrganizationRole.ORG_SUPER_ADMIN || currentRole === OrganizationRole.ORG_ADMIN;")
replace(p, "    if (profile?.role === 'Manager' && (role === 'Owner' || role === 'Manager')) {", "    if (currentRole === OrganizationRole.MANAGER && (role === OrganizationRole.ORG_SUPER_ADMIN || role === OrganizationRole.ORG_ADMIN || role === OrganizationRole.MANAGER)) {")
replace(p, "    if (profile?.role !== 'Owner' && (addRole === 'Owner' || addRole === 'Manager')) {", "    if (!isOwner && (addRole === OrganizationRole.ORG_SUPER_ADMIN || addRole === OrganizationRole.ORG_ADMIN || addRole === OrganizationRole.MANAGER)) {")
replace(p, "          setAddRole('Stylist');", "          setAddRole(OrganizationRole.EMPLOYEE);")
replace(p,
"    const c: Record<OrganizationRole, number> = { Owner: 0, Manager: 0, Stylist: 0, 'Front Desk': 0 };",
"    const c: Record<OrganizationRole, number> = {\n      [OrganizationRole.ORG_SUPER_ADMIN]: 0,\n      [OrganizationRole.ORG_ADMIN]: 0,\n      [OrganizationRole.MANAGER]: 0,\n      [OrganizationRole.EMPLOYEE]: 0,\n      [OrganizationRole.OTHER_AUTHORIZED_ROLE]: 0,\n    };")
replace(p, "value={String(counts.Owner)}", "value={String(counts[OrganizationRole.ORG_SUPER_ADMIN] + counts[OrganizationRole.ORG_ADMIN])}")
replace(p, "value={String(counts.Manager)}", "value={String(counts[OrganizationRole.MANAGER])}")
replace(p, "value={String(counts.Stylist + counts['Front Desk'])}", "value={String(counts[OrganizationRole.EMPLOYEE] + counts[OrganizationRole.OTHER_AUTHORIZED_ROLE])}")
replace(p, "{r === 'Front Desk' ? 'Desk' : r}", "{r === OrganizationRole.EMPLOYEE ? 'Staff' : r}")
replace(p, "const isDisabled = !isOwner || s.role === 'Owner';", "const isDisabled = !isOwner || s.role === OrganizationRole.ORG_SUPER_ADMIN;")
replace(p, "disabled={selectedStaffForActions.role === 'Owner'}", "disabled={selectedStaffForActions.role === OrganizationRole.ORG_SUPER_ADMIN}")

# Time clock: canonical RBAC values + valid location ids.
p = 'apps/marketing/src/components/vowos/TimeClockView.tsx'
replace(p, "import { OrganizationRole, STAFF_ROLES } from '@/lib/auth/roles';;", "import { OrganizationRole, STAFF_ROLES, normalizeOrganizationRole } from '@/lib/auth/roles';")
replace(p, "import { LOCATIONS, locationById, formatCents, formatDate } from '@/data/vowosData';", "import { LOCATIONS, LocationId, locationById, formatCents, formatDate } from '@/data/vowosData';")
replace(p, "  locationId: string;", "  locationId: LocationId;")
replace(p, "  const [chosenLoc, setChosenLoc] = useState<string>('covington');", "  const [chosenLoc, setChosenLoc] = useState<LocationId>('ido-cov');")
replace(p, "  const [targetLoc, setTargetLoc] = useState('covington');", "  const [targetLoc, setTargetLoc] = useState<LocationId>('ido-cov');")
replace(p,
"    { id: '1', name: 'nedpearson', role: 'Owner' },\n    { id: '2', name: 'Eleanor Vance', role: 'Manager' },\n    { id: '3', name: 'Sophia Miller', role: 'Stylist' },\n    { id: '4', name: 'Chloe Bennett', role: 'Stylist' },\n    { id: '5', name: 'Olivia Davis', role: 'Front Desk' },",
"    { id: '1', name: 'nedpearson', role: OrganizationRole.ORG_SUPER_ADMIN },\n    { id: '2', name: 'Eleanor Vance', role: OrganizationRole.MANAGER },\n    { id: '3', name: 'Sophia Miller', role: OrganizationRole.EMPLOYEE },\n    { id: '4', name: 'Chloe Bennett', role: OrganizationRole.EMPLOYEE },\n    { id: '5', name: 'Olivia Davis', role: OrganizationRole.OTHER_AUTHORIZED_ROLE },")
replace(p, "setStaffList(staffData.map(s => ({ ...s, role: s.role as OrganizationRole })));", "setStaffList(staffData.map((s) => ({ ...s, role: normalizeOrganizationRole(String(s.role)) })));" )
replace(p, "return { department: 'Bridal Styling', locationId: 'covington', breaks: [], transfers: [] };", "return { department: 'Bridal Styling', locationId: 'ido-cov', breaks: [], transfers: [] };", 2)
replace(p, "onChange={(e) => setChosenLoc(e.target.value)}", "onChange={(e) => setChosenLoc(e.target.value as LocationId)}")

print('PR100 repair batch applied successfully')
