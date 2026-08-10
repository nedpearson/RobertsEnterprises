import { useMemo, useState, useEffect } from 'react';
import { Search, Receipt, Loader2, Plus, Link2 } from 'lucide-react';
import { Invoice, formatCents, formatDate } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { PageHeader, StatusBadge, inputCls, btnPrimary } from './ui';
import { NewInvoiceModal } from './InvoiceModals';
import TerminalCheckoutModal from '@/features/pos/TerminalCheckoutModal';
import PaymentLinkModal from './PaymentLinkModal';

import BridalIdentity from './BridalIdentity';

import ItemizedSalesDetailModal, { DetailedSaleItem } from '@/features/sales/components/ItemizedSalesDetailModal';
import { Eye, Shirt } from 'lucide-react';

const FILTERS = ['All', 'Paid', 'Partial', 'Open', 'Overdue'] as const;

export default function InvoicesView() {
  const { invoices: list, brides = [], loading } = useVowosData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [linkInvoiceId, setLinkInvoiceId] = useState<string | null>(null);
  const [itemizedSale, setItemizedSale] = useState<DetailedSaleItem | null>(null);

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      const targetId = sessionStorage.getItem('vowos_target_invoice_id');
      if (targetId) {
        setQuery(targetId);
        const inv = list.find((i) => i.id === targetId || i.id.toLowerCase().includes(targetId.toLowerCase()));
        if (inv) setPayingInvoiceId(inv.id);
        sessionStorage.removeItem('vowos_target_invoice_id');
      }
    }
  }, [list]);


  const filtered = useMemo(
    () =>
      (list || []).filter(
        (i) =>
          (filter === 'All' || i.status === filter) &&
          ((i.customer || '').toLowerCase().includes((query || '').toLowerCase()) || (i.id || '').toLowerCase().includes((query || '').toLowerCase())),
      ),
    [list, query, filter],
  );

  const outstanding = list.reduce((s, i) => s + (i.amountCents - i.paidCents), 0);
  const payingInvoice: Invoice | null = list.find((i) => i.id === payingInvoiceId) ?? null;

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${list.length} invoices · ${formatCents(outstanding)} outstanding`}
        action={
          <button onClick={() => setShowNewInvoice(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" />
            New Invoice
          </button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoices..." className={`${inputCls} pl-9`} />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-100 text-sm">
            <thead className="bg-stone-50/70">
              <tr>
                {['Invoice', 'Customer', 'Amount', 'Balance', 'Due', 'Status', ''].map((h, i) => (
                  <th key={i} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-stone-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-primary" />
                    <p className="mt-2 text-xs">Loading invoices...</p>
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((inv) => {
                  const balance = inv.amountCents - inv.paidCents;
                  return (
                    <tr key={inv.id} className="transition-colors hover:bg-brand-soft/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-stone-300" />
                          <div>
                            <p className="font-medium text-stone-800">{inv.id}</p>
                            <p className="text-xs text-stone-400">{inv.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <BridalIdentity
                          customer={brides.find((b) => b.name.toLowerCase() === inv.customer.toLowerCase()) || { name: inv.customer }}
                          size="xs"
                          showName
                        />
                      </td>
                      <td className="px-5 py-3.5 font-medium text-stone-800">{formatCents(inv.amountCents)}</td>
                      <td className={`px-5 py-3.5 font-medium ${balance > 0 ? 'text-status-warning' : 'text-stone-400'}`}>
                        {balance > 0 ? formatCents(balance) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-stone-700">{formatDate(inv.dueDate)}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              const bride = brides.find((b) => b.name.toLowerCase() === inv.customer.toLowerCase());
                              setItemizedSale({
                                id: `item-${inv.id}`,
                                invoiceId: inv.id,
                                customerName: inv.customer,
                                weddingDate: bride?.weddingDate || '2026-11-14',
                                designer: inv.description.includes('Monique') ? 'Monique Lhuillier' : inv.description.includes('Ines') ? 'Ines Di Santo' : 'I Do Atelier',
                                gownName: inv.description || 'Custom Bridal Gown',
                                styleNumber: `STYLE-${inv.id}`,
                                sku: `SKU-881029384912`,
                                gownType: 'Couture Bridal Gown',
                                size: 'Bridal Size 10 (Bust 34", Waist 26", Hips 38")',
                                color: 'Ivory / French Silk Satin & Chantilly Lace',
                                fabric: 'Silk Satin & Hand-Beaded Lace',
                                condition: 'New Custom Atelier Order',
                                wholesaleCostCents: Math.round(inv.amountCents * 0.4),
                                retailPriceCents: inv.amountCents,
                                paidCents: inv.paidCents,
                                locationId: inv.location || 'ido-br',
                                stylist: bride?.stylist || 'Ramsey Roberts',
                                saleDate: inv.dueDate || '2026-07-20',
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand-primary-hover transition-colors hover:bg-brand-soft cursor-pointer"
                            title="Inspect full designer, gown style, size, fabric, cost, and price specs"
                          >
                            <Shirt className="h-3.5 w-3.5 text-brand-primary" /> Item Specs
                          </button>

                          {balance > 0 && (
                            <button
                              onClick={() => setLinkInvoiceId(inv.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-rose-300 hover:text-brand-primary cursor-pointer"
                              title="Copy, email, or text a payment link"
                            >
                              <Link2 className="h-3.5 w-3.5" /> Payment Link
                            </button>
                          )}
                          {balance > 0 && (
                            <button
                              onClick={() => setPayingInvoiceId(inv.id)}
                              className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-700 cursor-pointer"
                            >
                              Record Payment
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-stone-500">
                    No invoices match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewInvoiceModal open={showNewInvoice} onClose={() => setShowNewInvoice(false)} />
      <TerminalCheckoutModal invoice={payingInvoice} onClose={() => setPayingInvoiceId(null)} />
      {linkInvoiceId && (
        <PaymentLinkModal
          invoice={list.find((i) => i.id === linkInvoiceId) ?? null}
          onClose={() => setLinkInvoiceId(null)}
        />
      )}
      <ItemizedSalesDetailModal item={itemizedSale} onClose={() => setItemizedSale(null)} />
    </div>
  );
}

