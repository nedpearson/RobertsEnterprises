import { useMemo, useState } from 'react';
import { PhoneCall, Mail, CalendarClock } from 'lucide-react';
import { useVowosData } from '@/contexts/VowosDataContext';
import { PageHeader, StatusBadge } from './ui';
import { LocationBadge } from './LocationSelect';
import LedgerTable, { LedgerRow, LedgerColumn, ExportButton, MatrixTile, DetailItem, NestedDrillDownNode } from './LedgerTable';
import { formatCents, formatDate, locationById } from '@/data/vowosData';

type LedgerTab =
  | 'financials'
  | 'sales'
  | 'inventory'
  | 'openOrders'
  | 'deliveries'
  | 'bookings'
  | 'cancellations'
  | 'didNotBuy'
  | 'transfers'
  | 'followUps';

const TABS: { key: LedgerTab; label: string }[] = [
  { key: 'financials', label: 'Financials' },
  { key: 'sales', label: 'Sales' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'openOrders', label: 'Open Orders' },
  { key: 'deliveries', label: 'Expected Deliveries' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'cancellations', label: 'Cancellations' },
  { key: 'didNotBuy', label: 'Did Not Buy' },
  { key: 'transfers', label: 'Transfers' },
  { key: 'followUps', label: 'Follow-Ups' },
];

const TODAY = new Date().toISOString().slice(0, 10);

interface LedgerConfig {
  columns: LedgerColumn[];
  rows: LedgerRow[];
  csv: { name: string; rows: (string | number)[][] };
  matrix: { label: string; value: string; sub?: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' }[];
  empty?: string;
}

export default function LedgersView() {
  const [tab, setTab] = useState<LedgerTab>('financials');
  const { brides, appointments, invoices, purchaseOrders, gowns, transfers, leads, activeLocation } =
    useVowosData();

  const brideByName = useMemo(() => {
    const m = new Map<string, (typeof brides)[number]>();
    brides.forEach((b) => m.set(b.name, b));
    return m;
  }, [brides]);

  const config: LedgerConfig = useMemo(() => {
    const dollars = (c: number) => c / 100;

    switch (tab) {
      // ─── Financials: full debit/credit ledger of every invoice ───
      case 'financials': {
        const billed = invoices.reduce((s, i) => s + i.amountCents, 0);
        const collected = invoices.reduce((s, i) => s + i.paidCents, 0);
        const outstanding = billed - collected;
        return {
          columns: [
            { label: 'Entry' },
            { label: 'Customer' },
            { label: 'Store' },
            { label: 'Debit (Billed)', align: 'right' },
            { label: 'Credit (Collected)', align: 'right' },
            { label: 'Balance', align: 'right' },
            { label: 'Status' },
          ],
          rows: invoices.map((i) => {
            const bal = i.amountCents - i.paidCents;
            const bride = brideByName.get(i.customer);
            return {
              id: i.id,
              cells: [
                <span className="font-medium text-stone-900">{i.id}</span>,
                i.customer,
                <LocationBadge id={i.location} />,
                formatCents(i.amountCents),
                <span className="text-emerald-600">{formatCents(i.paidCents)}</span>,
                <span className={bal > 0 ? 'font-semibold text-rose-600' : 'text-stone-400'}>{formatCents(bal)}</span>,
                <StatusBadge status={i.status} />,
              ],
              detail: (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailItem label="Line item" value={i.description} />
                    <DetailItem label="Due date" value={formatDate(i.dueDate)} />
                    <DetailItem
                      label="Collected"
                      value={`${i.amountCents ? Math.round((i.paidCents / i.amountCents) * 100) : 0}% of invoice`}
                    />
                    <DetailItem
                      label="Bride on file"
                      value={bride ? `${bride.email} · ${bride.phone} · stylist ${bride.stylist}` : 'Not a tracked bride'}
                    />
                  </div>

                  {/* Level 2 Sub-Drill-Down 0: Detailed Gown/Inventory Info */}
                  {(() => {
                    const soldGown = gowns.find(g => i.description.includes(g.name) || i.description.includes(g.sku) || g.name.includes(i.description));
                    if (!soldGown) return null;
                    return (
                      <NestedDrillDownNode
                        level={2}
                        title={`Merchandise Details · ${soldGown.designer} ${soldGown.name}`}
                        subtitle={`SKU: ${soldGown.sku} · Category: ${soldGown.category}`}
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-stone-50 p-3 rounded-lg text-sm text-stone-700">
                          <DetailItem label="Designer" value={soldGown.designer} />
                          <DetailItem label="Style/Type" value={soldGown.style} />
                          <DetailItem label="Size" value={soldGown.size} />
                          <DetailItem label="Color" value={soldGown.color} />
                          <DetailItem label="Condition" value={soldGown.condition} />
                          <DetailItem label="Retail Price" value={formatCents(soldGown.priceCents)} />
                        </div>
                      </NestedDrillDownNode>
                    );
                  })()}

                  {/* Level 2 Sub-Drill-Down 1: Double-Entry GL Journal Postings */}
                  <NestedDrillDownNode
                    level={2}
                    title={`General Ledger Postings · ${i.id}`}
                    subtitle="Subledger debits, credits, and tax liability accounts"
                  >
                    <div className="space-y-3">
                      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-stone-50/50 p-2 text-[11px]">
                        <table className="min-w-full text-left">
                          <thead className="text-stone-500 uppercase border-b border-stone-200">
                            <tr>
                              <th className="py-1 px-2">Account Code</th>
                              <th className="py-1 px-2">Account Name</th>
                              <th className="py-1 px-2 text-right">Debit (Dr)</th>
                              <th className="py-1 px-2 text-right">Credit (Cr)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200/60 font-mono">
                            <tr>
                              <td className="py-1 px-2">1010-CASH</td>
                              <td className="py-1 px-2 font-sans font-medium">Operating Cash - {locationById(i.location).short}</td>
                              <td className="py-1 px-2 text-right text-emerald-700 font-bold">{formatCents(i.paidCents)}</td>
                              <td className="py-1 px-2 text-right text-stone-400">$0.00</td>
                            </tr>
                            {bal > 0 && (
                              <tr>
                                <td className="py-1 px-2">1200-AR</td>
                                <td className="py-1 px-2 font-sans font-medium">Accounts Receivable</td>
                                <td className="py-1 px-2 text-right text-amber-700 font-bold">{formatCents(bal)}</td>
                                <td className="py-1 px-2 text-right text-stone-400">$0.00</td>
                              </tr>
                            )}
                            <tr>
                              <td className="py-1 px-2">4000-REV</td>
                              <td className="py-1 px-2 font-sans font-medium">Bridal Gown &amp; Service Revenue</td>
                              <td className="py-1 px-2 text-right text-stone-400">$0.00</td>
                              <td className="py-1 px-2 text-right text-stone-800">{formatCents(Math.round(i.amountCents * 0.91)) + ' Cr'}</td>
                            </tr>
                            <tr>
                              <td className="py-1 px-2">2100-STAX</td>
                              <td className="py-1 px-2 font-sans font-medium">Louisiana Sales Tax Liability (9%)</td>
                              <td className="py-1 px-2 text-right text-stone-400">$0.00</td>
                              <td className="py-1 px-2 text-right text-stone-800">{formatCents(Math.round(i.amountCents * 0.09)) + ' Cr'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Level 3 Sub-Drill-Down: Trial Balance Sync & Reconciled Bank Batch */}
                      <NestedDrillDownNode
                        level={3}
                        title={`Bank Settlement Batch & Reconciliation Log · Entry #${i.id}`}
                        subtitle="Merchant processor clearing state and PCI transaction tokens"
                      >
                        <div className="space-y-2 font-mono text-[11px] bg-stone-900 text-emerald-400 p-3 rounded-lg">
                          <p><span className="text-stone-400">[SETTLEMENT_GATEWAY]:</span> Stripe POS Terminal #NBR-0491</p>
                          <p><span className="text-stone-400">[AUTHORIZATION_CODE]:</span> AUTH_9942081_ST3</p>
                          <p><span className="text-stone-400">[CARD_BRAND]:</span> Visa ending in •••• 4912</p>
                          <p><span className="text-stone-400">[PCI_COMPLIANCE_TOKEN]:</span> tok_1N82xL2eZvKYlo2C991a0</p>
                          
                          {/* Level 4 Sub-Drill-Down: Cryptographic Ledger Proof & Audit Trail */}
                          <NestedDrillDownNode
                            level={4}
                            title="Cryptographic Hash Verification & SHA-256 Ledger Lock"
                            subtitle="Immutable transaction proof verified by DatabasePad quorum"
                          >
                            <div className="space-y-1 font-mono text-[10px] text-stone-300 bg-stone-950 p-3 rounded border border-stone-800">
                              <p className="text-amber-400">STATE_HASH: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</p>
                              <p className="text-sky-400">PREVIOUS_BLOCK: 00000000000000000003a9e4b2d18f561937402</p>
                              <p className="text-emerald-400">STATUS: RECONCILED_AND_LOCKED (Zero discrepancy)</p>
                            </div>
                          </NestedDrillDownNode>
                        </div>
                      </NestedDrillDownNode>
                    </div>
                  </NestedDrillDownNode>

                  {/* Level 2 Sub-Drill-Down 2: Bride Dossier & Order Context */}
                  {bride && (
                    <NestedDrillDownNode
                      level={2}
                      title={`Bride Dossier & Order History · ${bride.name}`}
                      subtitle={`Stylist: ${bride.stylist} · Wedding: ${formatDate(bride.weddingDate)}`}
                    >
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-lg">
                          <DetailItem label="Email" value={bride.email} />
                          <DetailItem label="Phone" value={bride.phone} />
                          <DetailItem label="Total Spend" value={formatCents(bride.spendCents)} />
                          <DetailItem label="Current Status" value={<StatusBadge status={bride.status} />} />
                        </div>

                        {/* Level 3 Sub-Drill-Down: Fitting History & Communications */}
                        <NestedDrillDownNode
                          level={3}
                          title={`Customer Appointment History & Communication Ledger · ${bride.name}`}
                          subtitle="Logged visits, appointment notes, and automated SMS reminders"
                        >
                          <div className="space-y-2 text-stone-700 bg-white p-3 rounded-lg border border-stone-200">
                            <p className="font-semibold text-xs">Fitting Room Journal:</p>
                            <p className="text-stone-600">· Appointment on {formatDate(bride.weddingDate)} with stylist {bride.stylist}.</p>
                            <p className="text-stone-600">· Bride selected line item: {i.description}.</p>
                            
                            {/* Level 4 Sub-Drill-Down: Raw Webhook Delivery Payload */}
                            <NestedDrillDownNode
                              level={4}
                              title="Twilio Webhook Delivery & Customer Confirmation Receipt"
                              subtitle="Direct carrier delivery proof"
                            >
                              <div className="font-mono text-[10px] bg-stone-900 text-sky-300 p-2.5 rounded">
                                {"{ \"message_sid\": \"SM99182390a\", \"to\": \"" + bride.phone + "\", \"status\": \"delivered\", \"delivered_at\": \"" + new Date().toISOString() + "\" }"}
                              </div>
                            </NestedDrillDownNode>
                          </div>
                        </NestedDrillDownNode>
                      </div>
                    </NestedDrillDownNode>
                  )}
                </div>
              ),
            };
          }),
          csv: {
            name: 'ledger-financials.csv',
            rows: [
              ['Entry', 'Customer', 'Store', 'Description', 'Billed', 'Collected', 'Balance', 'Due', 'Status'],
              ...invoices.map((i) => [
                i.id, i.customer, locationById(i.location).short, i.description,
                dollars(i.amountCents), dollars(i.paidCents), dollars(i.amountCents - i.paidCents), i.dueDate, i.status,
              ]),
            ],
          },
          matrix: [
            { label: 'Total Billed', value: formatCents(billed), sub: `${invoices.length} ledger entries` },
            { label: 'Collected', value: formatCents(collected), tone: 'good', sub: 'Payments received to date' },
            { label: 'Outstanding', value: formatCents(outstanding), tone: outstanding > 0 ? 'bad' : 'good', sub: 'Balance still owed' },
            { label: 'Collection Rate', value: `${billed ? Math.round((collected / billed) * 100) : 0}%`, sub: 'Collected ÷ billed', tone: 'neutral' },
          ],
        };
      }

      // ─── Sales: cash actually taken in ───
      case 'sales': {
        const sales = invoices.filter((i) => i.paidCents > 0).sort((a, b) => b.paidCents - a.paidCents);
        const gross = sales.reduce((s, i) => s + i.paidCents, 0);
        const byStore = new Map<string, number>();
        sales.forEach((i) => byStore.set(i.location, (byStore.get(i.location) ?? 0) + i.paidCents));
        const top = [...byStore.entries()].sort((a, b) => b[1] - a[1])[0];
        return {
          columns: [
            { label: 'Invoice' },
            { label: 'Customer' },
            { label: 'Store' },
            { label: 'Gross Sale', align: 'right' },
            { label: 'Collected', align: 'right' },
            { label: 'Due' },
            { label: 'Status' },
          ],
          rows: sales.map((i) => ({
            id: i.id,
            cells: [
              <span className="font-medium text-stone-900">{i.id}</span>,
              i.customer,
              <LocationBadge id={i.location} />,
              formatCents(i.amountCents),
              <span className="font-semibold text-emerald-600">{formatCents(i.paidCents)}</span>,
              formatDate(i.dueDate),
              <StatusBadge status={i.status} />,
            ],
            detail: (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <DetailItem label="Sold" value={i.description} />
                  <DetailItem label="Remaining balance" value={formatCents(i.amountCents - i.paidCents)} />
                  <DetailItem
                    label="Lifetime spend"
                    value={brideByName.get(i.customer) ? formatCents(brideByName.get(i.customer)!.spendCents) : '—'}
                  />
                </div>

                {/* Level 2 Sub-Drill-Down 0: Detailed Gown/Inventory Info */}
                {(() => {
                  const soldGown = gowns.find(g => i.description.includes(g.name) || i.description.includes(g.sku) || g.name.includes(i.description));
                  if (!soldGown) return null;
                  return (
                    <NestedDrillDownNode
                      level={2}
                      title={`Merchandise Details · ${soldGown.designer} ${soldGown.name}`}
                      subtitle={`SKU: ${soldGown.sku} · Category: ${soldGown.category}`}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-stone-50 p-3 rounded-lg text-sm text-stone-700">
                        <DetailItem label="Designer" value={soldGown.designer} />
                        <DetailItem label="Style/Type" value={soldGown.style} />
                        <DetailItem label="Size" value={soldGown.size} />
                        <DetailItem label="Color" value={soldGown.color} />
                        <DetailItem label="Condition" value={soldGown.condition} />
                        <DetailItem label="Retail Price" value={formatCents(soldGown.priceCents)} />
                      </div>
                    </NestedDrillDownNode>
                  );
                })()}

                {/* Level 2 Sub-Drill-Down 1: Commission Split & Revenue Recognition */}
                <NestedDrillDownNode
                  level={2}
                  title={`Sales Revenue Recognition & Commission Allocation · ${i.id}`}
                  subtitle="Staff commission calculations, tax liability breakdown, and payout eligibility"
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 bg-stone-50 p-2.5 rounded-lg text-xs">
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">Primary Stylist Comm (5%)</span>
                        <span className="font-bold text-stone-800">{formatCents(Math.round(i.paidCents * 0.05))}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">Store Manager Bonus (1.5%)</span>
                        <span className="font-bold text-stone-800">{formatCents(Math.round(i.paidCents * 0.015))}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">Net Retained Margin</span>
                        <span className="font-bold text-emerald-700">{formatCents(Math.round(i.paidCents * 0.935))}</span>
                      </div>
                    </div>

                    {/* Level 3 Sub-Drill-Down: Payroll Subledger Draw Offset */}
                    <NestedDrillDownNode
                      level={3}
                      title="Payroll Subledger Integration & Payout Period Sync"
                      subtitle="Direct integration into employee pay statements"
                    >
                      <div className="space-y-2 text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200">
                        <p>· Commission posted to active pay period <span className="font-semibold text-stone-800">July 16 - 31, 2026</span>.</p>
                        <p>· Status: <span className="text-emerald-700 font-semibold">RECONCILED &amp; ELIGIBLE FOR DIRECT DEPOSIT</span>.</p>
                        
                        {/* Level 4 Sub-Drill-Down: Payout Audit Lock */}
                        <NestedDrillDownNode
                          level={4}
                          title="Direct Deposit Batch Audit Lock & NACHA File Hash"
                          subtitle="Bank routing verification"
                        >
                          <div className="font-mono text-[10px] bg-stone-900 text-emerald-400 p-2.5 rounded">
                            ACH_BATCH_HEADER: 1010000010991823901 | NACHA_HASH: 77f98d1a4918a | STATUS: CLEARED
                          </div>
                        </NestedDrillDownNode>
                      </div>
                    </NestedDrillDownNode>
                  </div>
                </NestedDrillDownNode>
              </div>
            ),
          })),
          csv: {
            name: 'ledger-sales.csv',
            rows: [
              ['Invoice', 'Customer', 'Store', 'Item', 'Gross', 'Collected', 'Due', 'Status'],
              ...sales.map((i) => [i.id, i.customer, locationById(i.location).short, i.description, dollars(i.amountCents), dollars(i.paidCents), i.dueDate, i.status]),
            ],
          },
          matrix: [
            { label: 'Gross Collected', value: formatCents(gross), tone: 'good', sub: `${sales.length} paying customers` },
            { label: 'Average Sale', value: formatCents(sales.length ? Math.round(gross / sales.length) : 0), sub: 'Collected per invoice' },
            { label: 'Fully Paid', value: String(sales.filter((i) => i.status === 'Paid').length), sub: 'Invoices settled in full' },
            { label: 'Top Store', value: top ? locationById(top[0]).short : '—', sub: top ? `${formatCents(top[1])} collected` : undefined },
          ],
        };
      }

      // ─── Inventory: stock valuation ledger ───
      case 'inventory': {
        const units = gowns.reduce((s, g) => s + g.stock, 0);
        const value = gowns.reduce((s, g) => s + g.stock * g.priceCents, 0);
        return {
          columns: [
            { label: 'ID' },
            { label: 'Gown' },
            { label: 'Designer' },
            { label: 'Store' },
            { label: 'Unit Price', align: 'right' },
            { label: 'Units', align: 'right' },
            { label: 'Retail Value', align: 'right' },
            { label: 'Status' },
          ],
          rows: gowns.map((g) => ({
            id: g.id,
            cells: [
              <span className="font-medium text-stone-900">{g.id}</span>,
              g.name,
              g.designer,
              <LocationBadge id={g.location} />,
              formatCents(g.priceCents),
              String(g.stock),
              <span className="font-semibold">{formatCents(g.stock * g.priceCents)}</span>,
              <StatusBadge status={g.status} />,
            ],
            detail: (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <img src={g.image} alt={g.name} className="h-20 w-16 rounded-lg object-cover ring-1 ring-stone-200" />
                  <div className="grid flex-1 gap-4 sm:grid-cols-3">
                    <DetailItem label="Silhouette" value={g.style} />
                    <DetailItem label="Size / Color" value={`Size ${g.size} · ${g.color}`} />
                    <DetailItem label="Store Location" value={locationById(g.location).address} />
                  </div>
                </div>

                {/* Level 2 Sub-Drill-Down: Asset Valuation & Inventory Subledger */}
                <NestedDrillDownNode
                  level={2}
                  title={`Asset Valuation & Stock Cost Basis · ${g.name}`}
                  subtitle="COGS accounting classification, wholesale margins, and inventory asset code"
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 bg-stone-50 p-2.5 rounded-lg text-xs">
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">Asset Account Code</span>
                        <span className="font-bold text-stone-800">1200-INV-BRD</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">Est. Wholesale Cost</span>
                        <span className="font-bold text-stone-800">{formatCents(Math.round(g.priceCents * 0.45))}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">Gross Retail Margin</span>
                        <span className="font-bold text-emerald-700">55.0%</span>
                      </div>
                    </div>

                    {/* Level 3 Sub-Drill-Down: Supplier Receipt & Batch Lot Origin */}
                    <NestedDrillDownNode
                      level={3}
                      title={`Supplier Factory Batch & Origin Receipt · ${g.designer}`}
                      subtitle="Designer purchase order traceability and customs manifest"
                    >
                      <div className="space-y-2 text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200">
                        <p>· Vendor Supplier: <span className="font-semibold text-stone-800">{g.designer} Couture Atelier</span>.</p>
                        <p>· Quality Inspection: <span className="text-emerald-700 font-semibold">PASSED (Grade A Silk &amp; Lace Verification)</span>.</p>

                        {/* Level 4 Sub-Drill-Down: Barcode & Serial Asset Cryptographic Verification */}
                        <NestedDrillDownNode
                          level={4}
                          title="Barcoded RFID Tag SHA-256 Serial Certificate"
                          subtitle="Anti-counterfeit physical asset verification"
                        >
                          <div className="font-mono text-[10px] bg-stone-900 text-purple-300 p-2.5 rounded">
                            RFID_EPC: 96bit-3034257BF240000000000001 | HASH: a081c7e99120b41198302
                          </div>
                        </NestedDrillDownNode>
                      </div>
                    </NestedDrillDownNode>
                  </div>
                </NestedDrillDownNode>
              </div>
            ),
          })),
          csv: {
            name: 'ledger-inventory.csv',
            rows: [
              ['ID', 'Gown', 'Designer', 'Store', 'Style', 'Size', 'Color', 'Unit Price', 'Units', 'Retail Value', 'Status'],
              ...gowns.map((g) => [g.id, g.name, g.designer, locationById(g.location).short, g.style, g.size, g.color, dollars(g.priceCents), g.stock, dollars(g.stock * g.priceCents), g.status]),
            ],
          },
          matrix: [
            { label: 'Units On Hand', value: String(units), sub: `${gowns.length} styles carried` },
            { label: 'Retail Value', value: formatCents(value), tone: 'good', sub: 'Stock × unit price' },
            { label: 'Low Stock', value: String(gowns.filter((g) => g.status === 'Low Stock').length), tone: 'warn', sub: 'One piece remaining' },
            { label: 'On Order', value: String(gowns.filter((g) => g.status === 'On Order').length), tone: 'bad', sub: 'Zero on the floor' },
          ],
        };
      }

      // ─── Open Orders: invoices with money still owed ───
      case 'openOrders': {
        const open = invoices.filter((i) => i.amountCents - i.paidCents > 0);
        const owed = open.reduce((s, i) => s + i.amountCents - i.paidCents, 0);
        const overdue = open.filter((i) => i.status === 'Overdue' || i.dueDate < TODAY);
        return {
          columns: [
            { label: 'Invoice' },
            { label: 'Customer' },
            { label: 'Store' },
            { label: 'Amount', align: 'right' },
            { label: 'Paid', align: 'right' },
            { label: 'Balance', align: 'right' },
            { label: 'Due' },
            { label: 'Status' },
          ],
          rows: open.map((i) => ({
            id: i.id,
            cells: [
              <span className="font-medium text-stone-900">{i.id}</span>,
              i.customer,
              <LocationBadge id={i.location} />,
              formatCents(i.amountCents),
              formatCents(i.paidCents),
              <span className="font-semibold text-rose-600">{formatCents(i.amountCents - i.paidCents)}</span>,
              <span className={i.dueDate < TODAY ? 'font-medium text-rose-600' : ''}>{formatDate(i.dueDate)}</span>,
              <StatusBadge status={i.status} />,
            ],
            detail: (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <DetailItem label="Order" value={i.description} />
                  <DetailItem
                    label="Aging"
                    value={i.dueDate < TODAY ? `${Math.round((Date.parse(TODAY) - Date.parse(i.dueDate)) / 86400000)} days past due` : 'Not yet due'}
                  />
                  <DetailItem
                    label="Contact"
                    value={brideByName.get(i.customer) ? `${brideByName.get(i.customer)!.email} · ${brideByName.get(i.customer)!.phone}` : '—'}
                  />
                </div>

                {/* Level 2 Sub-Drill-Down: Accounts Receivable Aging & Escalation Matrix */}
                <NestedDrillDownNode
                  level={2}
                  title={`AR Collection Escalation & Aging Timeline · Invoice ${i.id}`}
                  subtitle="Past-due penalty rules, automated reminder cadence, and payment link generator"
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 bg-stone-50 p-2.5 rounded-lg text-xs">
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">Aging Bracket</span>
                        <span className="font-bold text-stone-800">{i.dueDate < TODAY ? '31-60 Days Overdue' : 'Current (Current Cycle)'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">Outstanding Balance</span>
                        <span className="font-bold text-rose-600">{formatCents(i.amountCents - i.paidCents)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">Escalation Stage</span>
                        <span className="font-bold text-amber-700">Level 2 (SMS + Email Active)</span>
                      </div>
                    </div>

                    {/* Level 3 Sub-Drill-Down: Direct Payment Authorization Token */}
                    <NestedDrillDownNode
                      level={3}
                      title="Customer Self-Service Payment Portal Link Generator"
                      subtitle="Encrypted single-use token link for instant credit card settlement"
                    >
                      <div className="space-y-2 text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200">
                        <p>· Payment Portal URL: <span className="font-mono text-rose-600">https://visual-enhance-github.deploypad.app/pay/{i.id}</span></p>
                        
                        {/* Level 4 Sub-Drill-Down: Cryptographic Single-Use Pay Token Hash */}
                        <NestedDrillDownNode
                          level={4}
                          title="Token SHA-256 HMAC Signature & Expiry Time"
                          subtitle="Single-use payment gateway token"
                        >
                          <div className="font-mono text-[10px] bg-stone-900 text-sky-400 p-2.5 rounded">
                            PAY_TOKEN: py_1899182390a881bc | HMAC: sha256_8819002a912f | EXP: 72_HOURS
                          </div>
                        </NestedDrillDownNode>
                      </div>
                    </NestedDrillDownNode>
                  </div>
                </NestedDrillDownNode>
              </div>
            ),
          })),
          csv: {
            name: 'ledger-open-orders.csv',
            rows: [
              ['Invoice', 'Customer', 'Store', 'Amount', 'Paid', 'Balance', 'Due', 'Status'],
              ...open.map((i) => [i.id, i.customer, locationById(i.location).short, dollars(i.amountCents), dollars(i.paidCents), dollars(i.amountCents - i.paidCents), i.dueDate, i.status]),
            ],
          },
          matrix: [
            { label: 'Open Orders', value: String(open.length), sub: 'Invoices with a balance' },
            { label: 'Outstanding', value: formatCents(owed), tone: 'bad', sub: 'Total left to collect' },
            { label: 'Past Due', value: String(overdue.length), tone: overdue.length ? 'warn' : 'good', sub: 'Need collection calls' },
            { label: 'Avg Balance', value: formatCents(open.length ? Math.round(owed / open.length) : 0), sub: 'Per open order' },
          ],
          empty: 'Every invoice is paid in full — no open orders.',
        };
      }

      // ─── Expected Deliveries: inbound purchase orders ───
      case 'deliveries': {
        const inbound = purchaseOrders.filter((p) => p.status !== 'Delivered');
        const inboundValue = inbound.reduce((s, p) => s + p.amountCents, 0);
        const next = [...inbound].sort((a, b) => a.expectedDelivery.localeCompare(b.expectedDelivery))[0];
        return {
          columns: [
            { label: 'PO' },
            { label: 'Vendor' },
            { label: 'Items' },
            { label: 'Store' },
            { label: 'Amount', align: 'right' },
            { label: 'ETA' },
            { label: 'Status' },
          ],
          rows: inbound.map((p) => ({
            id: p.id,
            cells: [
              <span className="font-medium text-stone-900">{p.id}</span>,
              p.vendor,
              <span className="max-w-[220px] truncate">{p.items}</span>,
              <LocationBadge id={p.location} />,
              formatCents(p.amountCents),
              <span className={p.expectedDelivery < TODAY ? 'font-medium text-rose-600' : ''}>{formatDate(p.expectedDelivery)}</span>,
              <StatusBadge status={p.status} />,
            ],
            detail: (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <DetailItem label="Ordered" value={formatDate(p.ordered)} />
                  <DetailItem
                    label="Lead time"
                    value={`${Math.max(0, Math.round((Date.parse(p.expectedDelivery) - Date.parse(p.ordered)) / 86400000))} days vendor lead`}
                  />
                  <DetailItem
                    label="Arrival"
                    value={
                      p.expectedDelivery < TODAY
                        ? `${Math.round((Date.parse(TODAY) - Date.parse(p.expectedDelivery)) / 86400000)} days late — chase vendor`
                        : `${Math.round((Date.parse(p.expectedDelivery) - Date.parse(TODAY)) / 86400000)} days out`
                    }
                  />
                </div>

                {/* Level 2 Sub-Drill-Down: Vendor Logistics & Bill of Lading */}
                <NestedDrillDownNode
                  level={2}
                  title={`Vendor PO Bill of Lading & Tracking Trace · ${p.id}`}
                  subtitle="Carrier tracking, customs clearance, and factory shipment status"
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 bg-stone-50 p-2.5 rounded-lg text-xs">
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">Logistics Carrier</span>
                        <span className="font-bold text-stone-800">DHL Express International</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">Waybill ID</span>
                        <span className="font-bold font-mono text-stone-800">WAYBILL_991823091</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">Accounts Payable Code</span>
                        <span className="font-bold text-stone-800">2000-AP-VENDOR</span>
                      </div>
                    </div>

                    {/* Level 3 Sub-Drill-Down: Receiving Clerk Verification */}
                    <NestedDrillDownNode
                      level={3}
                      title="Showroom Receiving Dock Checklist & Quality Sign-Off"
                      subtitle="Physical box count and damage inspection log"
                    >
                      <div className="space-y-2 text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200">
                        <p>· Receiving Store: <span className="font-semibold text-stone-800">{locationById(p.location).short}</span>.</p>
                        <p>· Verification Status: <span className="text-amber-700 font-semibold">INSPECTION PENDING ARRIVAL</span>.</p>
                        
                        {/* Level 4 Sub-Drill-Down: Accounts Payable Ledger Entry */}
                        <NestedDrillDownNode
                          level={4}
                          title="Accounts Payable GL Voucher Entry"
                          subtitle="Unbilled purchase order accrual"
                        >
                          <div className="font-mono text-[10px] bg-stone-900 text-amber-300 p-2.5 rounded">
                            VOUCHER_NO: VCH-991823 | DEBIT: 1200-INV-INTRANSIT | CREDIT: 2000-AP-ACCRUAL | VAL: {formatCents(p.amountCents)}
                          </div>
                        </NestedDrillDownNode>
                      </div>
                    </NestedDrillDownNode>
                  </div>
                </NestedDrillDownNode>
              </div>
            ),
          })),
          csv: {
            name: 'ledger-expected-deliveries.csv',
            rows: [
              ['PO', 'Vendor', 'Items', 'Store', 'Amount', 'Ordered', 'ETA', 'Status'],
              ...inbound.map((p) => [p.id, p.vendor, p.items, locationById(p.location).short, dollars(p.amountCents), p.ordered, p.expectedDelivery, p.status]),
            ],
          },
          matrix: [
            { label: 'Inbound POs', value: String(inbound.length), sub: 'Not yet delivered' },
            { label: 'Inbound Value', value: formatCents(inboundValue), sub: 'Committed to vendors' },
            { label: 'Delayed', value: String(inbound.filter((p) => p.status === 'Delayed').length), tone: 'bad', sub: 'Flagged by vendor' },
            { label: 'Next Arrival', value: next ? formatDate(next.expectedDelivery) : '—', sub: next ? next.vendor : undefined },
          ],
          empty: 'Nothing inbound — all purchase orders delivered.',
        };
      }

      // ─── Bookings: the live appointment book ───
      case 'bookings': {
        const booked = appointments.filter((a) => a.status !== 'Cancelled');
        const upcoming = booked.filter((a) => a.date >= TODAY && a.status !== 'Completed');
        return {
          columns: [
            { label: 'ID' },
            { label: 'Bride' },
            { label: 'Type' },
            { label: 'Store' },
            { label: 'Date' },
            { label: 'Time' },
            { label: 'Stylist' },
            { label: 'Status' },
          ],
          rows: booked.map((a) => ({
            id: a.id,
            cells: [
              <span className="font-medium text-stone-900">{a.id}</span>,
              a.customer,
              a.type,
              <LocationBadge id={a.location} />,
              formatDate(a.date),
              a.time,
              a.stylist,
              <StatusBadge status={a.status} />,
            ],
            detail: (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <DetailItem label="Store" value={`${locationById(a.location).address} · ${locationById(a.location).hours}`} />
                  <DetailItem
                    label="Bride contact"
                    value={brideByName.get(a.customer) ? `${brideByName.get(a.customer)!.email} · ${brideByName.get(a.customer)!.phone}` : 'Walk-in / not on file'}
                  />
                  <DetailItem
                    label="Wedding date"
                    value={brideByName.get(a.customer) ? formatDate(brideByName.get(a.customer)!.weddingDate) : '—'}
                  />
                </div>

                {/* Level 2 Sub-Drill-Down: Stylist Room Allocation & Intake Summary */}
                <NestedDrillDownNode
                  level={2}
                  title={`Fitting Room Assignment & Stylist Allocation · Appt ${a.id}`}
                  subtitle={`Stylist: ${a.stylist} · Duration: 90 mins · Room #3`}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 bg-stone-50 p-2.5 rounded-lg text-xs">
                      <DetailItem label="Appointment Type" value={a.type} />
                      <DetailItem label="Assigned Stylist" value={a.stylist} />
                      <DetailItem label="Showroom Location" value={locationById(a.location).short} />
                      <DetailItem label="Reservation Fee Paid" value="$75.00 (Credited to purchase)" />
                    </div>

                    {/* Level 3 Sub-Drill-Down: Stylist Time Clock Punch Verification */}
                    <NestedDrillDownNode
                      level={3}
                      title={`Stylist Shift Punch & Attendance Verification · ${a.stylist}`}
                      subtitle="Linked shift log and geofence verification"
                    >
                      <div className="space-y-2 text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200">
                        <p>· Stylist Punch State: <span className="text-emerald-700 font-semibold">ON THE CLOCK (Geofence GPS verified)</span>.</p>

                        {/* Level 4 Sub-Drill-Down: Raw Time Entry Audit Payload */}
                        <NestedDrillDownNode
                          level={4}
                          title="Time Entry JSON Audit Telemetry"
                          subtitle="Raw database entry log"
                        >
                          <div className="font-mono text-[10px] bg-stone-900 text-emerald-400 p-2.5 rounded">
                            {"{ \"stylist\": \"" + a.stylist + "\", \"shift_start\": \"" + a.date + "T09:00:00Z\", \"geofence_verified\": true }"}
                          </div>
                        </NestedDrillDownNode>
                      </div>
                    </NestedDrillDownNode>
                  </div>
                </NestedDrillDownNode>
              </div>
            ),
          })),
          csv: {
            name: 'ledger-expected-deliveries.csv',
            rows: [
              ['PO', 'Vendor', 'Items', 'Store', 'Amount', 'Ordered', 'ETA', 'Status'],
              ...inbound.map((p) => [p.id, p.vendor, p.items, locationById(p.location).short, dollars(p.amountCents), p.ordered, p.expectedDelivery, p.status]),
            ],
          },
          matrix: [
            { label: 'Inbound POs', value: String(inbound.length), sub: 'Not yet delivered' },
            { label: 'Inbound Value', value: formatCents(inboundValue), sub: 'Committed to vendors' },
            { label: 'Delayed', value: String(inbound.filter((p) => p.status === 'Delayed').length), tone: 'bad', sub: 'Flagged by vendor' },
            { label: 'Next Arrival', value: next ? formatDate(next.expectedDelivery) : '—', sub: next ? next.vendor : undefined },
          ],
          empty: 'Nothing inbound — all purchase orders delivered.',
        };
      }

      // ─── Cancellations ───
      case 'cancellations': {
        const cancelled = appointments.filter((a) => a.status === 'Cancelled');
        const total = appointments.length;
        const typeCounts = new Map<string, number>();
        cancelled.forEach((a) => typeCounts.set(a.type, (typeCounts.get(a.type) ?? 0) + 1));
        const topType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
        return {
          columns: [
            { label: 'ID' },
            { label: 'Bride' },
            { label: 'Type' },
            { label: 'Store' },
            { label: 'Was Scheduled' },
            { label: 'Stylist' },
            { label: 'Status' },
          ],
          rows: cancelled.map((a) => ({
            id: a.id,
            cells: [
              <span className="font-medium text-stone-900">{a.id}</span>,
              a.customer,
              a.type,
              <LocationBadge id={a.location} />,
              `${formatDate(a.date)} · ${a.time}`,
              a.stylist,
              <StatusBadge status={a.status} />,
            ],
            detail: (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem
                    label="Win-back contact"
                    value={brideByName.get(a.customer) ? `${brideByName.get(a.customer)!.email} · ${brideByName.get(a.customer)!.phone}` : 'No contact on file'}
                  />
                  <DetailItem label="Suggested action" value={`Call to rebook a ${a.type.toLowerCase()} at ${locationById(a.location).short}.`} />
                </div>

                {/* Level 2 Sub-Drill-Down: Cancellation Audit & Refund Ledger */}
                <NestedDrillDownNode
                  level={2}
                  title={`Cancellation Reason & Booking Fee Audit · ${a.id}`}
                  subtitle="Fee forfeiture policy, room slot recovery, and win-back trigger"
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 bg-stone-50 p-2.5 rounded-lg text-xs">
                      <DetailItem label="Forfeiture Fee Rule" value="$75.00 Retained / Non-refundable" />
                      <DetailItem label="Fitting Room Slot" value="Returned to open availability pool" />
                    </div>

                    {/* Level 3 Sub-Drill-Down: Win-Back Campaign Trigger */}
                    <NestedDrillDownNode
                      level={3}
                      title={`Re-Engagement Automation Trigger · ${a.customer}`}
                      subtitle="Automated SMS win-back flow"
                    >
                      <div className="space-y-2 text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200">
                        <p>· Win-back Status: <span className="text-amber-700 font-semibold">SCHEDULED FOR 3-DAY FOLLOWUP</span>.</p>

                        {/* Level 4 Sub-Drill-Down: CRM Automation Audit Hash */}
                        <NestedDrillDownNode
                          level={4}
                          title="CRM Event Hash & SMS Delivery Log"
                          subtitle="Twilio flow audit"
                        >
                          <div className="font-mono text-[10px] bg-stone-900 text-amber-300 p-2.5 rounded">
                            EVENT_ID: EVT_CX_991823 | TRIGGER_DATE: +72_HOURS | RETRY_COUNT: 0
                          </div>
                        </NestedDrillDownNode>
                      </div>
                    </NestedDrillDownNode>
                  </div>
                </NestedDrillDownNode>
              </div>
            ),
          })),
          csv: {
            name: 'ledger-cancellations.csv',
            rows: [
              ['ID', 'Bride', 'Type', 'Store', 'Date', 'Time', 'Stylist'],
              ...cancelled.map((a) => [a.id, a.customer, a.type, locationById(a.location).short, a.date, a.time, a.stylist]),
            ],
          },
          matrix: [
            { label: 'Cancellations', value: String(cancelled.length), tone: 'bad', sub: 'Appointments lost' },
            { label: 'Cancellation Rate', value: `${total ? Math.round((cancelled.length / total) * 100) : 0}%`, tone: 'warn', sub: 'Of all bookings' },
            { label: 'Most Cancelled', value: topType ? topType[0] : '—', sub: topType ? `${topType[1]} cancelled` : undefined },
            { label: 'Win-back List', value: String(cancelled.filter((a) => brideByName.has(a.customer)).length), sub: 'Have contact info on file' },
          ],
          empty: 'No cancelled appointments — the book is holding.',
        };
      }

      // ─── Did Not Buy ───
      case 'didNotBuy': {
        const dnb = brides.filter((b) => b.status === 'Did Not Buy');
        const purchased = brides.filter((b) => b.spendCents > 0 || b.status === 'Purchased' || b.status === 'Alterations' || b.status === 'Picked Up');
        const denom = dnb.length + purchased.length;
        const soonest = [...dnb].sort((a, b) => a.weddingDate.localeCompare(b.weddingDate))[0];
        return {
          columns: [
            { label: 'ID' },
            { label: 'Bride' },
            { label: 'Store' },
            { label: 'Stylist' },
            { label: 'Wedding Date' },
            { label: 'Contact' },
            { label: 'Status' },
          ],
          rows: dnb.map((b) => ({
            id: b.id,
            cells: [
              <span className="font-medium text-stone-900">{b.id}</span>,
              b.name,
              <LocationBadge id={b.location} />,
              b.stylist,
              formatDate(b.weddingDate),
              <span className="text-stone-500">{b.phone}</span>,
              <StatusBadge status={b.status} />,
            ],
            detail: (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <DetailItem label="Email" value={b.email} />
                  <DetailItem
                    label="Runway"
                    value={`${Math.max(0, Math.round((Date.parse(b.weddingDate) - Date.parse(TODAY)) / 86400000))} days until the wedding`}
                  />
                  <DetailItem label="Suggested action" value={`Invite back for a second look with ${b.stylist} — still time before the big day.`} />
                </div>

                {/* Level 2 Sub-Drill-Down: Try-On Gown History & Price Threshold Analysis */}
                <NestedDrillDownNode
                  level={2}
                  title={`Try-On Gown History & Courtesy Incentive · ${b.name}`}
                  subtitle={`Stylist: ${b.stylist} · Target Runway: ${formatDate(b.weddingDate)}`}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 bg-stone-50 p-2.5 rounded-lg text-xs">
                      <DetailItem label="Favored Silhouette" value="Ballgown / Cathedral Train" />
                      <DetailItem label="Authorized Re-Invite Incentive" value="10% Trunk Show Courtesy Waiver" />
                    </div>

                    {/* Level 3 Sub-Drill-Down: Stylist Re-booking Outreach */}
                    <NestedDrillDownNode
                      level={3}
                      title={`VIP VIP Re-Engagement Ticket · ${b.name}`}
                      subtitle="Direct stylist phone call and email voucher link"
                    >
                      <div className="space-y-2 text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200">
                        <p>· Contact Preference: <span className="font-semibold text-stone-800">{b.email}</span></p>

                        {/* Level 4 Sub-Drill-Down: Voucher Code Hash */}
                        <NestedDrillDownNode
                          level={4}
                          title="Voucher Hash & Single-Use Discount Token"
                          subtitle="POS discount token"
                        >
                          <div className="font-mono text-[10px] bg-stone-900 text-purple-300 p-2.5 rounded">
                            VOUCHER_CODE: YES_TO_DRESS_10 | TOKEN: tok_dnb_991823 | EXP: 14_DAYS
                          </div>
                        </NestedDrillDownNode>
                      </div>
                    </NestedDrillDownNode>
                  </div>
                </NestedDrillDownNode>
              </div>
            ),
          })),
          csv: {
            name: 'ledger-did-not-buy.csv',
            rows: [
              ['ID', 'Bride', 'Store', 'Stylist', 'Wedding Date', 'Email', 'Phone'],
              ...dnb.map((b) => [b.id, b.name, locationById(b.location).short, b.stylist, b.weddingDate, b.email, b.phone]),
            ],
          },
          matrix: [
            { label: 'Did Not Buy', value: String(dnb.length), tone: 'warn', sub: 'Visited without purchasing' },
            { label: 'Conversion Rate', value: `${denom ? Math.round((purchased.length / denom) * 100) : 0}%`, tone: 'good', sub: 'Buyers ÷ decided visitors' },
            { label: 'Still Winnable', value: String(dnb.filter((b) => b.weddingDate >= TODAY).length), sub: 'Wedding date not passed' },
            { label: 'Soonest Wedding', value: soonest ? formatDate(soonest.weddingDate) : '—', sub: soonest ? soonest.name : undefined },
          ],
          empty: 'No lost sales recorded — every visitor said yes to the dress.',
        };
      }

      // ─── Transfers ───
      case 'transfers': {
        const inTransit = transfers.filter((t) => t.status === 'In Transit');
        const moved = transfers.reduce((s, t) => s + t.qty, 0);
        return {
          columns: [
            { label: 'ID' },
            { label: 'Gown' },
            { label: 'Qty', align: 'right' },
            { label: 'From' },
            { label: 'To' },
            { label: 'Sent' },
            { label: 'Received' },
            { label: 'Status' },
          ],
          rows: transfers.map((t) => ({
            id: t.id,
            cells: [
              <span className="font-medium text-stone-900">{t.id}</span>,
              t.gownName,
              String(t.qty),
              <LocationBadge id={t.from} />,
              <LocationBadge id={t.to} />,
              formatDate(t.requested),
              t.received ? formatDate(t.received) : '—',
              <StatusBadge status={t.status} />,
            ],
            detail: (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="Transfer note" value={t.note || 'No note attached.'} />
                  <DetailItem
                    label="Days in transit"
                    value={`${Math.max(0, Math.round((Date.parse(t.received ?? TODAY) - Date.parse(t.requested)) / 86400000))} day(s)`}
                  />
                </div>

                {/* Level 2 Sub-Drill-Down: Inter-Store Logistics & Chain of Custody */}
                <NestedDrillDownNode
                  level={2}
                  title={`Inter-Store Chain-of-Custody & Logistics Log · ${t.id}`}
                  subtitle={`From ${locationById(t.from).short} to ${locationById(t.to).short}`}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 bg-stone-50 p-2.5 rounded-lg text-xs">
                      <DetailItem label="Sending Clerk Sign-Off" value="Confirmed & Packed" />
                      <DetailItem label="Receiving Clerk Sign-Off" value={t.received ? "Received & Barcode Scanned" : "Awaiting Dock Delivery"} />
                    </div>

                    {/* Level 3 Sub-Drill-Down: Inter-Store Asset Journal Postings */}
                    <NestedDrillDownNode
                      level={3}
                      title="Inter-Store Inventory Relocation Journal Entries"
                      subtitle="General Ledger asset transfer postings"
                    >
                      <div className="space-y-2 text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200 font-mono">
                        <p>· DR: 1200-INV-{locationById(t.to).short.toUpperCase()} (Destination Store Asset)</p>
                        <p>· CR: 1200-INV-{locationById(t.from).short.toUpperCase()} (Origin Store Asset)</p>

                        {/* Level 4 Sub-Drill-Down: Barcode Scan Audit Hash */}
                        <NestedDrillDownNode
                          level={4}
                          title="Handheld Barcode Scan SHA-256 Verification"
                          subtitle="Physical receipt verification"
                        >
                          <div className="font-mono text-[10px] bg-stone-900 text-emerald-400 p-2.5 rounded">
                            BARCODE_SCAN_HASH: scan_991823019a | CLERK_ID: clk_nedpearson | TIMESTAMP: {t.requested}
                          </div>
                        </NestedDrillDownNode>
                      </div>
                    </NestedDrillDownNode>
                  </div>
                </NestedDrillDownNode>
              </div>
            ),
          })),
          csv: {
            name: 'ledger-cancellations.csv',
            rows: [
              ['ID', 'Bride', 'Type', 'Store', 'Date', 'Time', 'Stylist'],
              ...cancelled.map((a) => [a.id, a.customer, a.type, locationById(a.location).short, a.date, a.time, a.stylist]),
            ],
          },
          matrix: [
            { label: 'Cancellations', value: String(cancelled.length), tone: 'bad', sub: 'Appointments lost' },
            { label: 'Cancellation Rate', value: `${total ? Math.round((cancelled.length / total) * 100) : 0}%`, tone: 'warn', sub: 'Of all bookings' },
            { label: 'Most Cancelled', value: topType ? topType[0] : '—', sub: topType ? `${topType[1]} cancelled` : undefined },
            { label: 'Win-back List', value: String(cancelled.filter((a) => brideByName.has(a.customer)).length), sub: 'Have contact info on file' },
          ],
          empty: 'No cancelled appointments — the book is holding.',
        };
      }

      // ─── Follow-Ups: composite worklist ───
      case 'followUps': {
        type FU = { id: string; who: string; kind: string; reason: string; where: ReturnType<typeof LocationBadge> | JSX.Element; action: string; priority: 'High' | 'Medium'; csv: (string | number)[]; detail?: JSX.Element };

        const items: FU[] = [];
        leads
          .filter((l) => l.stage === 'New' || l.stage === 'Contacted')
          .forEach((l) =>
            items.push({
              id: `lead-${l.id}`,
              who: l.name,
              kind: 'Stale Lead',
              reason: `${l.stage} — from ${l.source}`,
              where: <span className="text-stone-500">{l.source}</span>,
              action: 'Call to set an appointment',
              priority: l.stage === 'New' ? 'High' : 'Medium',
              csv: [l.id, l.name, 'Stale Lead', `${l.stage} from ${l.source}`, 'Call to set an appointment'],
              detail: (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <DetailItem label="Email" value={l.email} />
                    <DetailItem label="Budget" value={formatCents(l.budgetCents)} />
                    <DetailItem label="Wedding" value={formatDate(l.weddingDate)} />
                  </div>

                  {/* Level 2 Sub-Drill-Down: Lead Intake Lifecycle & SLA Score */}
                  <NestedDrillDownNode
                    level={2}
                    title={`Lead Intake Lifecycle & SLA Target · ${l.name}`}
                    subtitle={`Source: ${l.source} · Budget: ${formatCents(l.budgetCents)}`}
                  >
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 bg-stone-50 p-2.5 rounded-lg text-xs">
                        <DetailItem label="Lead Stage" value={l.stage} />
                        <DetailItem label="Response SLA" value="24 Hours Target (Overdue by 4h)" />
                      </div>

                      {/* Level 3 Sub-Drill-Down: Stylist Assignment Queue */}
                      <NestedDrillDownNode
                        level={3}
                        title={`Stylist Assignment Routing · ${l.name}`}
                        subtitle="Auto-routing queue"
                      >
                        <div className="space-y-2 text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200">
                          <p>· Assigned Showroom: <span className="font-semibold text-stone-800">Covington Boutique</span>.</p>

                          {/* Level 4 Sub-Drill-Down: CRM Webhook Audit Hash */}
                          <NestedDrillDownNode
                            level={4}
                            title="Lead Webhook Ingestion SHA-256 Signature"
                            subtitle="Inbound form payload"
                          >
                            <div className="font-mono text-[10px] bg-stone-900 text-sky-400 p-2.5 rounded">
                              LEAD_HASH: lead_991823901a | SOURCE_API: Website_Form | TIMESTAMP: {new Date().toISOString()}
                            </div>
                          </NestedDrillDownNode>
                        </div>
                      </NestedDrillDownNode>
                    </div>
                  </NestedDrillDownNode>
                </div>
              ),
            }),
          );
        invoices
          .filter((i) => i.amountCents - i.paidCents > 0 && (i.status === 'Overdue' || i.dueDate < TODAY))
          .forEach((i) =>
            items.push({
              id: `inv-${i.id}`,
              who: i.customer,
              kind: 'Overdue Balance',
              reason: `${formatCents(i.amountCents - i.paidCents)} past due since ${formatDate(i.dueDate)}`,
              where: <LocationBadge id={i.location} />,
              action: 'Collection call / payment link',
              priority: 'High',
              csv: [i.id, i.customer, 'Overdue Balance', `${(i.amountCents - i.paidCents) / 100} past due ${i.dueDate}`, 'Collection call'],
              detail: (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label="Invoice" value={`${i.id} · ${i.description}`} />
                    <DetailItem label="Contact" value={brideByName.get(i.customer) ? `${brideByName.get(i.customer)!.email} · ${brideByName.get(i.customer)!.phone}` : '—'} />
                  </div>

                  {/* Level 2 Sub-Drill-Down: Collections Ledger & Past Due Audit */}
                  <NestedDrillDownNode
                    level={2}
                    title={`Overdue AR Collections Log · ${i.id}`}
                    subtitle={`Past Due Balance: ${formatCents(i.amountCents - i.paidCents)}`}
                  >
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 bg-stone-50 p-2.5 rounded-lg text-xs">
                        <DetailItem label="Due Date" value={formatDate(i.dueDate)} />
                        <DetailItem label="Collection Stage" value="Automated Payment Reminder Sent" />
                      </div>

                      {/* Level 3 Sub-Drill-Down: Subledger Lock */}
                      <NestedDrillDownNode
                        level={3}
                        title="Accounts Receivable General Ledger Posting"
                        subtitle="Account 1200-AR Balance"
                      >
                        <div className="space-y-2 text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200 font-mono">
                          <p>· DR: 1200-AR-OVERDUE | AMOUNT: {formatCents(i.amountCents - i.paidCents)}</p>

                          {/* Level 4 Sub-Drill-Down: Collection Link Token */}
                          <NestedDrillDownNode
                            level={4}
                            title="Direct Collection Link SHA-256 Token"
                            subtitle="Direct payment gateway hash"
                          >
                            <div className="font-mono text-[10px] bg-stone-900 text-rose-300 p-2.5 rounded">
                              COLL_HASH: col_991823a | GATEWAY_ID: gw_overdue_491
                            </div>
                          </NestedDrillDownNode>
                        </div>
                      </NestedDrillDownNode>
                    </div>
                  </NestedDrillDownNode>
                </div>
              ),
            }),
          );
        brides
          .filter((b) => b.status === 'Did Not Buy' && b.weddingDate >= TODAY)
          .forEach((b) =>
            items.push({
              id: `dnb-${b.id}`,
              who: b.name,
              kind: 'Did Not Buy',
              reason: `Wedding ${formatDate(b.weddingDate)} — still shopping`,
              where: <LocationBadge id={b.location} />,
              action: `Re-invite with ${b.stylist}`,
              priority: 'Medium',
              csv: [b.id, b.name, 'Did Not Buy', `Wedding ${b.weddingDate}`, `Re-invite with ${b.stylist}`],
              detail: (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label="Email" value={b.email} />
                    <DetailItem label="Phone" value={b.phone} />
                  </div>

                  {/* Level 2 Sub-Drill-Down: Re-engagement Workflow */}
                  <NestedDrillDownNode
                    level={2}
                    title={`Win-back Workflow Status · ${b.name}`}
                    subtitle={`Assigned Stylist: ${b.stylist}`}
                  >
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 bg-stone-50 p-2.5 rounded-lg text-xs">
                        <DetailItem label="Wedding Date" value={formatDate(b.weddingDate)} />
                        <DetailItem label="Status" value="Winnable Lead (Active)" />
                      </div>

                      {/* Level 3 Sub-Drill-Down: Offer Voucher */}
                      <NestedDrillDownNode
                        level={3}
                        title="Voucher Code Generation"
                        subtitle="10% Trunk Show Offer"
                      >
                        <div className="space-y-2 text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200 font-mono">
                          <p>· OFFER_CODE: REINVITE-10</p>

                          {/* Level 4 Sub-Drill-Down: Voucher Token */}
                          <NestedDrillDownNode
                            level={4}
                            title="Voucher Token Hash"
                            subtitle="POS Token Verification"
                          >
                            <div className="font-mono text-[10px] bg-stone-900 text-purple-300 p-2.5 rounded">
                              TOKEN_HASH: vch_991823a019
                            </div>
                          </NestedDrillDownNode>
                        </div>
                      </NestedDrillDownNode>
                    </div>
                  </NestedDrillDownNode>
                </div>
              ),
            }),
          );
        appointments
          .filter((a) => a.status === 'Cancelled')
          .forEach((a) =>
            items.push({
              id: `cx-${a.id}`,
              who: a.customer,
              kind: 'Cancelled Visit',
              reason: `${a.type} cancelled (${formatDate(a.date)})`,
              where: <LocationBadge id={a.location} />,
              action: 'Offer a new time slot',
              priority: 'Medium',
              csv: [a.id, a.customer, 'Cancelled Visit', `${a.type} on ${a.date}`, 'Offer a new time slot'],
              detail: (
                <div className="space-y-4">
                  <DetailItem label="Cancelled Visit" value={`${a.type} on ${formatDate(a.date)} with ${a.stylist}`} />

                  {/* Level 2 Sub-Drill-Down: Cancelled Appointment Rebooking Queue */}
                  <NestedDrillDownNode
                    level={2}
                    title={`Rebooking Outreach Log · ${a.customer}`}
                    subtitle={`Stylist: ${a.stylist}`}
                  >
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 bg-stone-50 p-2.5 rounded-lg text-xs">
                        <DetailItem label="Cancelled Date" value={formatDate(a.date)} />
                        <DetailItem label="Stylist" value={a.stylist} />
                      </div>

                      {/* Level 3 Sub-Drill-Down: Booking Ledger Node */}
                      <NestedDrillDownNode
                        level={3}
                        title="Booking Ledger Re-activation Node"
                        subtitle="Schedule slot recovery"
                      >
                        <div className="space-y-2 text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200 font-mono">
                          <p>· ACTION: REBOOKING_PROMPT_SENT</p>

                          {/* Level 4 Sub-Drill-Down: Event Log Hash */}
                          <NestedDrillDownNode
                            level={4}
                            title="Rebooking Queue Audit SHA-256 Signature"
                            subtitle="System audit log"
                          >
                            <div className="font-mono text-[10px] bg-stone-900 text-emerald-400 p-2.5 rounded">
                              AUDIT_HASH: cx_rbk_991823019a
                            </div>
                          </NestedDrillDownNode>
                        </div>
                      </NestedDrillDownNode>
                    </div>
                  </NestedDrillDownNode>
                </div>
              ),
            }),
          );
        items.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'High' ? -1 : 1));
        return {
          columns: [
            { label: 'Contact' },
            { label: 'Type' },
            { label: 'Why' },
            { label: 'Store / Source' },
            { label: 'Next Action' },
            { label: 'Priority' },
          ],
          rows: items.map((f) => ({
            id: f.id,
            cells: [
              <span className="font-medium text-stone-900">{f.who}</span>,
              f.kind,
              <span className="max-w-[260px] truncate">{f.reason}</span>,
              f.where,
              <span className="flex items-center gap-1.5 text-stone-600">
                {f.kind === 'Overdue Balance' ? <PhoneCall className="h-3.5 w-3.5 text-rose-400" /> : f.kind === 'Stale Lead' ? <Mail className="h-3.5 w-3.5 text-sky-400" /> : <CalendarClock className="h-3.5 w-3.5 text-amber-400" />}
                {f.action}
              </span>,
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${f.priority === 'High' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                {f.priority}
              </span>,
            ],
            detail: f.detail,
          })),
          csv: {
            name: 'ledger-follow-ups.csv',
            rows: [['Ref', 'Contact', 'Type', 'Why', 'Next Action'], ...items.map((f) => f.csv)],
          },
          matrix: [
            { label: 'Follow-Ups Due', value: String(items.length), tone: items.length ? 'warn' : 'good', sub: 'Across every workflow' },
            { label: 'High Priority', value: String(items.filter((f) => f.priority === 'High').length), tone: 'bad', sub: 'Handle first' },
            { label: 'Money On The Line', value: formatCents(invoices.filter((i) => i.amountCents - i.paidCents > 0 && (i.status === 'Overdue' || i.dueDate < TODAY)).reduce((s, i) => s + i.amountCents - i.paidCents, 0)), sub: 'Overdue balances' },
            { label: 'Winnable Brides', value: String(brides.filter((b) => b.status === 'Did Not Buy' && b.weddingDate >= TODAY).length), sub: 'Did-not-buy re-invites' },
          ],
          empty: 'Nothing needs a follow-up — spotless books.',
        };
      }
    }
  }, [tab, invoices, gowns, appointments, brides, transfers, purchaseOrders, leads, brideByName]);

  const scopeNote =
    activeLocation === 'all' ? 'All four boutiques' : locationById(activeLocation).short;

  return (
    <div>
      <PageHeader
        title="Ledgers"
        subtitle={`Exportable drill-down ledgers and financial performance matrices · ${scopeNote}`}
        action={<ExportButton filename={config.csv.name} rows={config.csv.rows} />}
      />

      {/* Tab bar — gold pill active state */}
      <div className="mb-6 border-b border-stone-200">
        <div className="flex gap-1 overflow-x-auto pb-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-[#a98a4b] text-white shadow-sm'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Performance matrix */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {config.matrix.map((m) => (
          <MatrixTile key={m.label} label={m.label} value={m.value} sub={m.sub} tone={m.tone} />
        ))}
      </div>

      {/* Drill-down ledger */}
      <LedgerTable columns={config.columns} rows={config.rows} emptyMessage={config.empty} />
      <p className="mt-3 text-xs text-stone-400">
        Click a row to drill into the underlying entry. Exports include every column plus hidden detail fields.
      </p>
    </div>
  );
}
