import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Invoice, formatCents } from '@/data/vowosData';
import { useVowosData, NewInvoiceInput } from '@/contexts/VowosDataContext';
import { Modal, StatusBadge, inputCls, btnPrimary, btnSecondary } from './ui';

const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500';

/** Parse a dollars string ("1,250.50") into integer cents. Returns NaN when invalid. */
function dollarsToCents(value: string): number {
  const n = parseFloat(value.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

// ─── New Invoice ───

export function NewInvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { brides, addInvoice } = useVowosData();
  const [customer, setCustomer] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [deposit, setDeposit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sortedBrides = useMemo(
    () => [...brides].sort((a, b) => a.name.localeCompare(b.name)),
    [brides],
  );

  useEffect(() => {
    if (open) {
      setCustomer('');
      setDescription('');
      setAmount('');
      setDeposit('');
      setDueDate('');
      setError('');
      setSaving(false);
    }
  }, [open]);

  const amountCents = dollarsToCents(amount);
  const depositCents = deposit.trim() === '' ? 0 : dollarsToCents(deposit);
  const previewStatus =
    Number.isFinite(amountCents) && amountCents > 0 && Number.isFinite(depositCents)
      ? depositCents >= amountCents
        ? 'Paid'
        : depositCents > 0
          ? 'Partial'
          : 'Open'
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!customer) return setError('Please choose a bride.');
    if (!description.trim()) return setError('Please enter a description.');
    if (!Number.isFinite(amountCents) || amountCents <= 0)
      return setError('Please enter a valid invoice amount greater than $0.');
    if (!Number.isFinite(depositCents) || depositCents < 0)
      return setError('Deposit must be a valid amount (or leave it blank).');
    if (depositCents > amountCents)
      return setError('Deposit cannot exceed the invoice amount.');
    if (!dueDate) return setError('Please pick a due date.');

    const input: NewInvoiceInput = {
      customer,
      description: description.trim(),
      amountCents,
      depositCents,
      dueDate,
    };
    setSaving(true);
    const ok = await addInvoice(input);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Invoice">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="inv-bride">Bride</label>
          <select
            id="inv-bride"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className={inputCls}
          >
            <option value="">Select a bride...</option>
            {sortedBrides.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name} · wedding {b.weddingDate}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="inv-desc">Description</label>
          <input
            id="inv-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Elowen gown + veil"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="inv-amount">Amount ($)</label>
            <input
              id="inv-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="3450.00"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="inv-deposit">Deposit collected ($)</label>
            <input
              id="inv-deposit"
              type="number"
              min="0"
              step="0.01"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="inv-due">Due date</label>
          <input
            id="inv-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputCls}
          />
        </div>

        {previewStatus && (
          <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600 ring-1 ring-stone-200">
            <span>Will be created as</span>
            <StatusBadge status={previewStatus} />
            {previewStatus !== 'Open' && Number.isFinite(depositCents) && depositCents > 0 && (
              <span>· {formatCents(depositCents)} added to the bride's spend total</span>
            )}
          </div>
        )}

        {error && <p className="text-sm text-brand-primary">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Record Payment (full or partial) ───

export function RecordPaymentModal({
  invoice,
  onClose,
}: {
  invoice: Invoice | null;
  onClose: () => void;
}) {
  const { recordPayment } = useVowosData();
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const balanceCents = invoice ? invoice.amountCents - invoice.paidCents : 0;

  useEffect(() => {
    if (invoice) {
      setAmount((balanceCents / 100).toFixed(2));
      setError('');
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id]);

  if (!invoice) return null;

  const paymentCents = dollarsToCents(amount);
  const willBePaid = Number.isFinite(paymentCents) && paymentCents >= balanceCents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!Number.isFinite(paymentCents) || paymentCents <= 0)
      return setError('Please enter a payment amount greater than $0.');
    if (paymentCents > balanceCents)
      return setError(`Payment cannot exceed the ${formatCents(balanceCents)} balance.`);
    setSaving(true);
    const ok = await recordPayment(invoice.id, paymentCents);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Record Payment · ${invoice.id}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500">Customer</p>
            <p className="mt-1 text-sm font-medium text-stone-800">{invoice.customer}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500">Total / Paid</p>
            <p className="mt-1 text-sm font-medium text-stone-800">
              {formatCents(invoice.amountCents)}
              <span className="text-stone-400"> / {formatCents(invoice.paidCents)}</span>
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500">Balance</p>
            <p className="mt-1 text-sm font-semibold text-status-warning">{formatCents(balanceCents)}</p>
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="pay-amount">Payment amount ($)</label>
          <div className="flex gap-2">
            <input
              id="pay-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setAmount((balanceCents / 100).toFixed(2))}
              className={btnSecondary}
            >
              Pay&nbsp;in&nbsp;full
            </button>
          </div>
        </div>

        {Number.isFinite(paymentCents) && paymentCents > 0 && paymentCents <= balanceCents && (
          <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600 ring-1 ring-stone-200">
            <span>Invoice will become</span>
            <StatusBadge status={willBePaid ? 'Paid' : 'Partial'} />
            <span>· {formatCents(paymentCents)} added to the bride's spend total</span>
          </div>
        )}

        {error && <p className="text-sm text-brand-primary">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
