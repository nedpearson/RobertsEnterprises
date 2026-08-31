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
                <span className="text-status-success">{formatCents(i.paidCents)}</span>,
                <span className={bal > 0 ? 'font-semibold text-brand-primary' : 'text-stone-400'}>{formatCents(bal)}</span>,
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
              <span className="font-semibold text-status-success">{formatCents(i.paidCents)}</span>,
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
              <span className="font-semibold text-brand-primary">{formatCents(i.amountCents - i.paidCents)}</span>,
              <span className={i.dueDate < TODAY ? 'font-medium text-brand-primary' : ''}>{formatDate(i.dueDate)}</span>,
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
              <span className={p.expectedDelivery < TODAY ? 'font-medium text-brand-primary' : ''}>{formatDate(p.expectedDelivery)}</span>,
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

              </div>
            ),
          })),
          csv: {
            name: 'ledger-bookings.csv',
            rows: [
              ['ID', 'Bride', 'Type', 'Store', 'Date', 'Time', 'Stylist', 'Status'],
              ...booked.map((a) => [a.id, a.customer, a.type, locationById(a.location).short, a.date, a.time, a.stylist, a.status]),
            ],
          },
          matrix: [
            { label: 'Total Bookings', value: String(booked.length), sub: 'Active appointments' },
            { label: 'Upcoming', value: String(upcoming.length), sub: 'Future appointments' },
          ],
          empty: 'No bookings found.',
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

              </div>
            ),
          })),
          csv: {
            name: 'ledger-transfers.csv',
            rows: [
              ['ID', 'Gown', 'Qty', 'From', 'To', 'Sent', 'Received', 'Status'],
              ...transfers.map((t) => [t.id, t.gownName, t.qty, locationById(t.from).short, locationById(t.to).short, t.requested, (t as any).completed || (t as any).received || '-', t.status]),
            ],
          },
          matrix: [
            { label: 'Total Transfers', value: String(transfers.length), sub: 'All time' },
            { label: 'In Transit', value: String(inTransit.length), sub: 'Currently moving' },
            { label: 'Gowns Moved', value: String(moved), sub: 'Total units' },
          ],
          empty: 'No inventory transfers recorded.',
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
                {f.kind === 'Overdue Balance' ? <PhoneCall className="h-3.5 w-3.5 text-brand-primary" /> : f.kind === 'Stale Lead' ? <Mail className="h-3.5 w-3.5 text-sky-400" /> : <CalendarClock className="h-3.5 w-3.5 text-amber-400" />}
                {f.action}
              </span>,
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${f.priority === 'High' ? 'bg-brand-soft text-brand-primary-hover ring-focus-ring' : 'bg-status-warning/10 text-status-warning ring-amber-200'}`}>
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
    activeLocation === 'all' ? 'All locations' : locationById(activeLocation).short;

  return (
    <div>
      <PageHeader
        title="Ledgers"
        subtitle={`Exportable drill-down ledgers and financial performance matrices · ${scopeNote}`}
        action={<ExportButton filename={config.csv.name} rows={config.csv.rows} />}
      />

      {/* Tab bar — gold pill active state */}
      <div className="mb-6 border-b border-stone-200">
        <div data-tour-id="tabs-ledgers" className="flex gap-1 overflow-x-auto pb-3">
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
        Click a row to drill into the underlying entry. Exports include the table columns shown.
      </p>
    </div>
  );
}

