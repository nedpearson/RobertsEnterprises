import { useStylistNames } from '@/lib/staff/useStylistNames';
import { useMemo, useState, useEffect, FormEvent } from 'react';

import { Search, UserPlus, CheckCircle2, Loader2, Link2, Check, Mail, MessageSquare, Ruler, Users } from 'lucide-react';
import { formatCents, formatDate, Customer } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { sendAndLogMessage, isEmail, isPhone } from '@/lib/messaging';
import { portalUrl, portalLinkTemplates } from '@/lib/contractsAlterations';
import BrideProfileModal from './BrideProfileModal';
import Bride360View from './Bride360View';
import BridalIdentity from './BridalIdentity';
import { PageHeader, StatusBadge, Modal, inputCls, btnPrimary, BeautifulEmptyState } from './ui';
import { toast } from '@vowos/design-system';

const STATUS_FILTERS = ['All', 'Active', 'Purchased', 'Alterations', 'Picked Up'] as const;

export default function CustomersView() {
  const teamMembers = useStylistNames();
  const { brides: list, loading, addBride } = useVowosData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [sendingKey, setSendingKey] = useState('');
  const [profileBride, setProfileBride] = useState<Customer | null>(null);
  const [selectedBride, setSelectedBride] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', weddingDate: '', stylist: teamMembers[0], smsOptIn: true });

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      const targetId = sessionStorage.getItem('vowos_target_bride_id');
      if (targetId && list.length > 0) {
        const found = list.find((b) => b.id === targetId || b.name.toLowerCase().includes(targetId.toLowerCase()));
        if (found) {
          setSelectedBride(found);
          sessionStorage.removeItem('vowos_target_bride_id');
        }
      }
    }
  }, [list]);


  const filtered = useMemo(
    () =>
      (list || []).filter(
        (c) =>
          (filter === 'All' || c.status === filter) &&
          ((c.name || '').toLowerCase().includes((query || '').toLowerCase()) || (c.email || '').toLowerCase().includes((query || '').toLowerCase())),
      ),
    [list, query, filter],
  );

  const copyPortal = async (c: Customer) => {
    if (!c.portalToken) {
      toast({ title: 'No portal link yet', description: 'Refresh the page and try again.', variant: 'destructive' });
      return;
    }
    try {
      await navigator.clipboard.writeText(portalUrl(c));
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(''), 1600);
    } catch {
      toast({ title: 'Could not copy', description: portalUrl(c) });
    }
  };

  /** Email or text the bride her private portal link. */
  const sendPortal = async (c: Customer, channel: 'email' | 'sms') => {
    if (!c.portalToken) {
      toast({ title: 'No portal link yet', description: 'Refresh the page and try again.', variant: 'destructive' });
      return;
    }
    const to = channel === 'email' ? c.email : c.phone;
    if (channel === 'email' ? !isEmail(to) : !isPhone(to)) {
      toast({
        title: `No usable ${channel === 'email' ? 'email' : 'phone number'} on file`,
        variant: 'destructive',
      });
      return;
    }
    setSendingKey(`${c.id}-${channel}`);
    const tpl = portalLinkTemplates(c);
    const { ok, error } = await sendAndLogMessage({
      channel,
      to,
      subject: channel === 'email' ? tpl.emailSubject : undefined,
      body: channel === 'email' ? tpl.emailText : tpl.sms,
      html: channel === 'email' ? tpl.emailHtml : undefined,
      customer: c.name,
      kind: 'portal',
    });
    setSendingKey('');
    if (ok) toast({ title: `Portal link ${channel === 'email' ? 'emailed' : 'texted'} to ${c.name}` });
    else toast({ title: 'Send failed', description: error ?? 'Unknown error', variant: 'destructive' });
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/v1/tenant/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          phone: form.phone || undefined,
          sms_opt_in: form.smsOptIn === true,
          source: 'contact-form',
          tags: ['bride', 'vowos-customer'],
        }),
      });
    } catch {
      // non-blocking
    }
    const ok = await addBride({
      name: form.name,
      email: form.email,
      phone: form.phone,
      weddingDate: form.weddingDate,
      stylist: form.stylist,
    });
    setSaving(false);
    if (!ok) return;
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setModalOpen(false);
      setForm({ name: '', email: '', phone: '', weddingDate: '', stylist: teamMembers[0], smsOptIn: true });
    }, 1200);
  };

  if (selectedBride) {
    return <Bride360View bride={selectedBride} onBack={() => setSelectedBride(null)} />;
  }

  return (
    <div>
      <PageHeader
        title="Brides"
        subtitle={`${list.length} brides in your book · ${list.filter((c) => c.status === 'Active').length} actively shopping`}
        action={
          <button data-tour-id="btn-add-customer" onClick={() => setModalOpen(true)} className={btnPrimary}>
            <UserPlus className="h-4 w-4" /> Add Bride
          </button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            data-tour-id="search-customers"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brides..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <div data-tour-id="filter-customers-status" className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
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

      {/* Desktop Table View (sm+) */}
      <div data-tour-id="table-customers" className="hidden sm:block overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-xs font-medium text-stone-500">
                <th className="px-5 py-3">Bride</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Wedding Date</th>
                <th className="px-5 py-3">Stylist</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Spend</th>
                <th className="px-5 py-3">Fit Profile</th>
                <th className="px-5 py-3">Portal Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-stone-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-primary" />
                    <p className="mt-2 text-xs">Loading brides...</p>
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-brand-soft/40">
                    <td className="px-5 py-3.5">
                      <BridalIdentity
                        customer={c}
                        size="md"
                        showName
                        clickable
                        onClick={() => setSelectedBride(c)}
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-stone-700">{c.email}</p>
                      <p className="text-xs text-stone-400">{c.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-stone-700">{formatDate(c.weddingDate)}</td>
                    <td className="px-5 py-3.5 text-stone-700">{c.stylist}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3.5 font-medium text-stone-800">
                      {c.spendCents > 0 ? formatCents(c.spendCents) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setProfileBride(c)}
                        title="Measurements & try-on notes"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-rose-300 hover:bg-brand-soft hover:text-brand-primary"
                      >
                        <Ruler className="h-3.5 w-3.5" /> Open
                      </button>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyPortal(c)}
                          title="Copy portal link"
                          className="rounded-lg border border-stone-200 p-1.5 text-stone-500 transition-colors hover:bg-stone-50"
                        >
                          {copiedId === c.id ? <Check className="h-3.5 w-3.5 text-status-success" /> : <Link2 className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => sendPortal(c, 'email')}
                          disabled={sendingKey === `${c.id}-email`}
                          title="Email portal link"
                          className="rounded-lg border border-stone-200 p-1.5 text-stone-500 transition-colors hover:bg-stone-50 disabled:opacity-50"
                        >
                          {sendingKey === `${c.id}-email` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => sendPortal(c, 'sms')}
                          disabled={sendingKey === `${c.id}-sms`}
                          title="Text portal link"
                          className="rounded-lg border border-stone-200 p-1.5 text-stone-500 transition-colors hover:bg-stone-50 disabled:opacity-50"
                        >
                          {sendingKey === `${c.id}-sms` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8">
                    <BeautifulEmptyState
                      icon={<Users className="h-8 w-8" />}
                      title="No Customers Found"
                      description="No brides match your current search criteria."
                      colorHint="sky"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Grid View (< 640px) */}
      <div className="space-y-3 sm:hidden">
        {!loading && filtered.map((c) => (
          <div key={c.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <button onClick={() => setProfileBride(c)} className="flex items-center gap-2 text-left">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-rose-200 text-xs font-semibold text-brand-primary">
                  {c.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-stone-900 text-sm">{c.name}</p>
                  <p className="text-[10px] text-stone-400">{c.id} · Stylist: {c.stylist}</p>
                </div>
              </button>
              <StatusBadge status={c.status} />
            </div>

            <div className="flex justify-between text-xs text-stone-600 border-t border-stone-100 pt-2 font-medium">
              <span>Wedding: {formatDate(c.weddingDate)}</span>
              <span>{c.spendCents > 0 ? formatCents(c.spendCents) : 'No Purchases'}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <button
                onClick={() => setProfileBride(c)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary"
              >
                <Ruler className="h-3.5 w-3.5" /> Fit Profile
              </button>

              <div className="flex items-center gap-1">
                <button onClick={() => copyPortal(c)} className="rounded-lg border border-stone-200 p-1.5 text-stone-500">
                  {copiedId === c.id ? <Check className="h-3.5 w-3.5 text-status-success" /> : <Link2 className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => sendPortal(c, 'email')} className="rounded-lg border border-stone-200 p-1.5 text-stone-500">
                  <Mail className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => sendPortal(c, 'sms')} className="rounded-lg border border-stone-200 p-1.5 text-stone-500">
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <BeautifulEmptyState
            icon={<Users className="h-8 w-8" />}
            title="No Customers Found"
            description="No brides match your current search criteria."
            colorHint="sky"
          />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Bride">
        {saved ? (
          <div className="flex flex-col items-center py-8">
            <CheckCircle2 className="h-12 w-12 text-status-success" />
            <p className="mt-3 font-medium text-stone-800">Bride added successfully</p>
          </div>
        ) : (
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Full name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Email *</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="jane@email.com" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Phone number (optional)</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="(555) 000-0000" />
            </div>
            <label className="flex items-start gap-2 text-xs text-stone-500">
              <input
                type="checkbox"
                checked={form.smsOptIn}
                onChange={(e) => setForm({ ...form, smsOptIn: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-brand-primary focus:ring-rose-300"
              />
              Text me appointment updates. Msg & data rates may apply. Reply STOP to unsubscribe.
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Wedding date</label>
                <input type="date" value={form.weddingDate} onChange={(e) => setForm({ ...form, weddingDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Stylist</label>
                <select value={form.stylist} onChange={(e) => setForm({ ...form, stylist: e.target.value })} className={inputCls}>
                  {teamMembers.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving} className={`${btnPrimary} w-full justify-center disabled:opacity-60`}>
              {saving ? 'Saving...' : 'Add Bride'}
            </button>
          </form>
        )}
      </Modal>

      {/* Fit profile: measurements & try-on notes */}
      <BrideProfileModal bride={profileBride} open={!!profileBride} onClose={() => setProfileBride(null)} />
    </div>
  );
}

