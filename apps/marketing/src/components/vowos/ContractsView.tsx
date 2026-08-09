import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { FileSignature, Loader2, Plus, Copy, Check, Mail, MessageSquare, ExternalLink, PenLine, Clock, FileText } from 'lucide-react';
import { useVowosData } from '@/contexts/VowosDataContext';
import { locationById, formatCents, formatDate, LocationId } from '@/data/vowosData';
import { LocationSelect } from './LocationSelect';
import { sendAndLogMessage, isEmail, isPhone } from '@/lib/messaging';
import {
  ContractRecord,
  CONTRACT_PDF_URL,
  fetchContracts,
  createContract,
  markContractSent,
  contractSignUrl,
  contractSignTemplates,
} from '@/lib/contractsAlterations';
import { PageHeader, StatusBadge, StatCard, Modal, inputCls, btnPrimary, btnSecondary } from './ui';
import { toast } from '@/components/ui/use-toast';

import BridalIdentity from './BridalIdentity';

export default function ContractsView() {
  const { activeLocation, brides = [] } = useVowosData();
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState<ContractRecord | null>(null);
  const [copiedId, setCopiedId] = useState('');
  const [sendingKey, setSendingKey] = useState('');

  const load = useCallback(async () => {
    setContracts(await fetchContracts());
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const scoped = useMemo(
    () => (activeLocation === 'all' ? contracts : contracts.filter((c) => c.location === activeLocation)),
    [contracts, activeLocation],
  );
  const awaiting = scoped.filter((c) => c.status === 'Sent');
  const signed = scoped.filter((c) => c.status === 'Signed');

  const copyLink = async (c: ContractRecord) => {
    try {
      await navigator.clipboard.writeText(contractSignUrl(c));
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(''), 1600);
    } catch {
      toast({ title: 'Could not copy', description: contractSignUrl(c) });
    }
  };

  /** Email or text the sign link, then flip Draft → Sent. */
  const sendLink = async (c: ContractRecord, channel: 'email' | 'sms') => {
    const bride = allBrides.find((b) => b.name === c.customer);
    const to = channel === 'email' ? bride?.email ?? '' : bride?.phone ?? '';
    if (channel === 'email' ? !isEmail(to) : !isPhone(to)) {
      toast({
        title: `No usable ${channel === 'email' ? 'email' : 'phone number'} on file`,
        description: `Update ${c.customer}'s contact info in Brides first.`,
        variant: 'destructive',
      });
      return;
    }
    setSendingKey(`${c.id}-${channel}`);
    const tpl = contractSignTemplates(c);
    const { ok, error } = await sendAndLogMessage({
      channel,
      to,
      subject: channel === 'email' ? tpl.emailSubject : undefined,
      body: channel === 'email' ? tpl.emailText : tpl.sms,
      html: channel === 'email' ? tpl.emailHtml : undefined,
      customer: c.customer,
      kind: 'contract',
    });
    setSendingKey('');
    if (ok) {
      await markContractSent(c.id);
      setContracts((prev) =>
        prev.map((x) =>
          x.id === c.id && x.status !== 'Signed'
            ? { ...x, status: 'Sent', sentAt: new Date().toISOString() }
            : x,
        ),
      );
      toast({ title: `Sign link ${channel === 'email' ? 'emailed' : 'texted'} to ${c.customer}` });
    } else {
      toast({ title: 'Send failed', description: error ?? 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle={`${scoped.length} contracts · ${awaiting.length} awaiting signature · ${signed.length} signed`}
        action={
          <button onClick={() => setModalOpen(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" /> New Contract
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting signature"
          value={String(awaiting.length)}
          sub="Sign links sent, not yet signed"
          icon={<Clock className="h-5 w-5" />}
          accent="amber"
        />
        <StatCard
          label="Signed"
          value={String(signed.length)}
          sub="Executed purchase agreements"
          icon={<PenLine className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          label="Under contract"
          value={formatCents(signed.reduce((s, c) => s + c.amountCents, 0))}
          sub="Total value of signed contracts"
          icon={<FileSignature className="h-5 w-5" />}
          accent="rose"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Purchase agreements</p>
          <a
            href={CONTRACT_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600"
          >
            <FileText className="h-3.5 w-3.5" /> Official contract PDF
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-100 text-sm">
            <thead className="bg-stone-50/70">
              <tr>
                {['Contract', 'Gown / merchandise', 'Amount', 'Store', 'Status', 'Send & sign'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-stone-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-rose-400" />
                    <p className="mt-2 text-xs">Loading contracts...</p>
                  </td>
                </tr>
              )}
              {!loading &&
                scoped.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-rose-50/40">
                    <td className="px-5 py-3.5">
                      <BridalIdentity
                        customer={brides.find((b) => b.name.toLowerCase() === c.customer.toLowerCase()) || { name: c.customer }}
                        size="xs"
                        showName
                        clickable
                        onClick={() => setDetail(c)}
                      />
                    </td>
                    <td className="max-w-[240px] px-5 py-3.5">
                      <p className="truncate text-stone-700" title={c.gown}>{c.gown}</p>
                      {c.signedAt && (
                        <p className="text-xs text-emerald-600">Signed {formatDate(c.signedAt.slice(0, 10))}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-stone-800">{formatCents(c.amountCents)}</p>
                      <p className="text-xs text-stone-400">Deposit {formatCents(c.depositCents)}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-stone-600">{locationById(c.location).short}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status === 'Sent' ? 'Pending' : c.status === 'Signed' ? 'Confirmed' : 'Open'} />
                      <p className="mt-1 text-[11px] text-stone-400">{c.status === 'Sent' ? 'Awaiting signature' : c.status}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {c.status === 'Signed' ? (
                        <button
                          onClick={() => setDetail(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          <Check className="h-3.5 w-3.5" /> View signature
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => sendLink(c, 'email')}
                            disabled={sendingKey === `${c.id}-email`}
                            title="Email sign link"
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                          >
                            {sendingKey === `${c.id}-email` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                            Email
                          </button>
                          <button
                            onClick={() => sendLink(c, 'sms')}
                            disabled={sendingKey === `${c.id}-sms`}
                            title="Text sign link"
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                          >
                            {sendingKey === `${c.id}-sms` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                            Text
                          </button>
                          <button
                            onClick={() => copyLink(c)}
                            title="Copy sign link"
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
                          >
                            {copiedId === c.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedId === c.id ? 'Copied' : 'Copy'}
                          </button>
                          <a
                            href={contractSignUrl(c)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open sign page"
                            className="inline-flex items-center rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              {!loading && scoped.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-stone-500">
                    No contracts yet — create one to send for e-signature.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewContractModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        brideNames={brides.map((b) => b.name)}
        contracts={contracts}
        onCreated={(rec) => setContracts((prev) => [rec, ...prev])}
      />

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Contract ${detail.id}` : ''}>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-stone-50 p-4">
              <p className="font-medium text-stone-800">{detail.customer}</p>
              <p className="mt-1 text-stone-600">{detail.gown}</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-stone-500">
                <span>Total: <strong className="text-stone-800">{formatCents(detail.amountCents)}</strong></span>
                <span>Deposit: <strong className="text-stone-800">{formatCents(detail.depositCents)}</strong></span>
                <span>Balance: <strong className="text-stone-800">{formatCents(detail.amountCents - detail.depositCents)}</strong></span>
                <span>{locationById(detail.location).short}</span>
              </div>
              {detail.specialTerms && (
                <p className="mt-3 text-xs text-stone-500">
                  <span className="font-semibold text-stone-600">Special terms:</span> {detail.specialTerms}
                </p>
              )}
            </div>
            {detail.status === 'Signed' ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Electronically signed</p>
                <p className="mt-2 font-serif text-2xl italic text-stone-800">{detail.signedName}</p>
                <p className="mt-1 text-xs text-stone-500">
                  Initials {detail.signedInitials} · {detail.signedAt ? formatDate(detail.signedAt.slice(0, 10)) : ''}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-700">
                {detail.status === 'Sent'
                  ? `Sign link sent ${detail.sentAt ? formatDate(detail.sentAt.slice(0, 10)) : ''} — awaiting the bride's signature.`
                  : 'Draft — send the sign link by email or text to start the e-sign process.'}
              </div>
            )}
            <a
              href={CONTRACT_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btnSecondary} w-full justify-center`}
            >
              <FileText className="h-4 w-4" /> View official contract PDF
            </a>
          </div>
        )}
      </Modal>
    </div>
  );
}

function NewContractModal({
  open,
  onClose,
  brideNames,
  contracts,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  brideNames: string[];
  contracts: ContractRecord[];
  onCreated: (rec: ContractRecord) => void;
}) {
  const { allBrides, activeLocation } = useVowosData();
  const [customer, setCustomer] = useState('');
  const [gown, setGown] = useState('');
  const [amount, setAmount] = useState('');
  const [deposit, setDeposit] = useState('');
  const [specialTerms, setSpecialTerms] = useState('');
  const [location, setLocation] = useState<LocationId>(activeLocation === 'all' ? 'ido-br' : activeLocation);
  const [saving, setSaving] = useState(false);

  const amountCents = Math.round(parseFloat(amount || '0') * 100);
  const suggestedDeposit = amountCents > 0 ? ((amountCents * 0.6) / 100).toFixed(2) : '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const depositCents = Math.round(parseFloat(deposit || '0') * 100);
    if (!customer || !gown.trim() || amountCents <= 0) return;
    setSaving(true);
    const bride = allBrides.find((b) => b.name === customer);
    const { record, error } = await createContract(
      {
        customer,
        location,
        gown: gown.trim(),
        amountCents,
        depositCents: Math.min(depositCents, amountCents),
        specialTerms: specialTerms.trim(),
      },
      contracts,
    );
    setSaving(false);
    if (error || !record) {
      toast({ title: 'Could not create contract', description: error ?? undefined, variant: 'destructive' });
      return;
    }
    onCreated(record);
    toast({ title: `Contract ${record.id} created`, description: 'Send the sign link by email or text.' });
    setCustomer('');
    setGown('');
    setAmount('');
    setDeposit('');
    setSpecialTerms('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Purchase Agreement">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Bride *</label>
          <select required value={customer} onChange={(e) => setCustomer(e.target.value)} className={inputCls}>
            <option value="">Select a bride…</option>
            {brideNames.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Gown / merchandise *</label>
          <input
            required
            value={gown}
            onChange={(e) => setGown(e.target.value)}
            className={inputCls}
            placeholder="Adeline — Ivory A-Line, Size 8 (special order)"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Purchase total *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputCls} pl-7`}
                placeholder="2890.00"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Deposit (60% standard)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                className={`${inputCls} pl-7`}
                placeholder={suggestedDeposit || '0.00'}
              />
            </div>
            {suggestedDeposit && (
              <button
                type="button"
                onClick={() => setDeposit(suggestedDeposit)}
                className="mt-1 text-[11px] font-medium text-rose-500 hover:text-rose-600"
              >
                Use 60% (${suggestedDeposit})
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Store</label>
          <LocationSelect value={location} onChange={setLocation} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Special terms (optional)</label>
          <textarea
            value={specialTerms}
            onChange={(e) => setSpecialTerms(e.target.value)}
            rows={2}
            className={inputCls}
            placeholder="Rush cut fee included; veil sold as-is…"
          />
        </div>
        <button type="submit" disabled={saving} className={`${btnPrimary} w-full justify-center disabled:opacity-60`}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
          {saving ? 'Creating…' : 'Create contract'}
        </button>
        <p className="text-center text-[11px] text-stone-400">
          The standard boutique terms (all sales final, deposit, alterations, storage) are attached automatically.
        </p>
      </form>
    </Modal>
  );
}
