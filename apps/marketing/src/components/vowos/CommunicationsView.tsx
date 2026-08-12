import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Mail, Search, Send, Loader2, CheckCircle2, AlertCircle, CalendarCheck, Link2, BellRing, Sparkles, Zap, RefreshCw, X, ArrowDownLeft, Sunrise, Phone, Instagram, Facebook, MessageCircle, Wand2 } from 'lucide-react';
import { Customer, formatCents, formatDate, locationById } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@vowos/design-system';
import BridalIdentity from './BridalIdentity';
import { PageHeader, inputCls, Modal } from './ui';
import {
  MessageChannel,
  MessageKind,
  MessageRecord,
  KIND_LABELS,
  fetchMessages,
  sendAndLogMessage,
  appointmentConfirmationTemplates,
  appointmentRescheduleTemplates,
  paymentLinkTemplates,
  overdueChaseTemplates,
  reminderTemplates,
  isEmail,
  isPhone,
  generateAiReply,
} from '@/lib/messaging';
import { fetchDigestSettings, saveDigestSettings } from '@/lib/fitProfile';
import BrideChecklist, { ChecklistDraft } from './BrideChecklist';


const todayIso = () => new Date().toISOString().slice(0, 10);

export default function CommunicationsView() {
  const { brides, allAppointments, allInvoices, setAppointmentStatus } = useVowosData();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<MessageRecord[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [channel, setChannel] = useState<MessageChannel>('sms');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<MessageKind>('general');
  const [sending, setSending] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [runningAuto, setRunningAuto] = useState(false);
  const [lastInboundCount, setLastInboundCount] = useState<Record<string, number>>({});
  const pollRef = useRef<number | null>(null);

  // Morning digest settings (persisted in app_settings, consumed by the 9am cron)
  const [digestEmail, setDigestEmail] = useState('');
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [savingDigest, setSavingDigest] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);

  useEffect(() => {
    fetchDigestSettings().then((s) => {
      setDigestEmail(s.email);
      setDigestEnabled(s.enabled);
    });
  }, []);


  const contacts = useMemo(
    () =>
      brides.filter(
        (b) =>
          b.name.toLowerCase().includes(query.toLowerCase()) ||
          b.email.toLowerCase().includes(query.toLowerCase()),
      ),
    [brides, query],
  );

  const selected: Customer | null = brides.find((b) => b.id === selectedId) ?? null;

  // Auto-select the first bride so the hub never opens empty
  useEffect(() => {
    if (!selectedId && brides.length > 0) setSelectedId(brides[0].id);
  }, [brides, selectedId]);

  // Pick the best default channel for the selected bride
  useEffect(() => {
    if (!selected) return;
    if (isPhone(selected.phone)) setChannel('sms');
    else if (isEmail(selected.email)) setChannel('email');
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadThread = async (name: string, showSpinner = true) => {
    if (showSpinner) setThreadLoading(true);
    const msgs = await fetchMessages(name);
    setThread(msgs);
    if (showSpinner) setThreadLoading(false);
    // Surface new inbound replies as a toast while the hub is open
    const inbound = msgs.filter((m) => m.direction === 'inbound').length;
    setLastInboundCount((prev) => {
      if (prev[name] !== undefined && inbound > prev[name]) {
        toast({ title: `New text from ${name}`, description: msgs.find((m) => m.direction === 'inbound')?.body?.slice(0, 120) });
      }
      return { ...prev, [name]: inbound };
    });
  };

  useEffect(() => {
    if (selected) loadThread(selected.name);
    else setThread([]);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Two-way texting: poll the thread every 12s so bride replies appear live ──
  useEffect(() => {
    if (!selected) return;
    pollRef.current = window.setInterval(() => loadThread(selected.name, false), 12000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Upcoming appointments awaiting confirmation (across all stores)
  const pendingConfirmations = useMemo(
    () =>
      allAppointments.filter(
        (a) => a.status === 'Pending' && a.date >= todayIso(),
      ),
    [allAppointments],
  );

  const nextApptFor = (name: string) =>
    allAppointments
      .filter((a) => a.customer === name && a.date >= todayIso() && a.status !== 'Cancelled' && a.status !== 'Completed')
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

  const openInvoiceFor = (name: string) =>
    allInvoices
      .filter((i) => i.customer === name && i.amountCents > i.paidCents)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null;

  const applyTemplate = (t: 'confirm' | 'reschedule' | 'payment' | 'chase' | 'reminder') => {
    if (!selected) return;
    if (t === 'payment' || t === 'chase') {
      const inv = openInvoiceFor(selected.name);
      if (!inv) {
        toast({ title: 'No open balance', description: `${selected.name} has no unpaid invoices.` });
        return;
      }
      const tpl = t === 'chase' ? overdueChaseTemplates(inv) : paymentLinkTemplates(inv);
      setKind(t === 'chase' ? 'chase' : 'payment');
      setSubject(tpl.emailSubject);
      setBody(channel === 'sms' ? tpl.sms : tpl.emailText);
      return;
    }
    const appt = nextApptFor(selected.name);
    if (!appt) {
      toast({ title: 'No upcoming appointment', description: `Book ${selected.name} first, then send a ${t} message.` });
      return;
    }
    const tpl =
      t === 'confirm'
        ? appointmentConfirmationTemplates(appt)
        : t === 'reschedule'
          ? appointmentRescheduleTemplates(appt)
          : reminderTemplates(appt);
    setKind(t === 'confirm' ? 'confirmation' : t === 'reschedule' ? 'reschedule' : 'reminder');
    setSubject(tpl.emailSubject);
    setBody(channel === 'sms' ? tpl.sms : tpl.emailText);
  };

  /** Checklist hands us an AI/template draft — load it into the composer. */
  const handleChecklistDraft = (draft: ChecklistDraft) => {
    setChannel(draft.channel);
    setKind(draft.kind);
    setSubject(draft.subject);
    setBody(draft.body);
  };

  const [generatingAi, setGeneratingAi] = useState(false);

  const handleMagicReply = async () => {
    if (!selected) return;
    setGeneratingAi(true);
    const { ok, text, error } = await generateAiReply(selected, thread, channel);
    setGeneratingAi(false);
    if (ok) {
      setBody(text);
      setKind('general');
      toast({ title: 'Magic Reply Generated', description: 'Review the drafted message before sending.' });
    } else {
      toast({ title: 'AI Generation Failed', description: error ?? 'Unknown error', variant: 'destructive' });
    }
  };

  const handleSend = async () => {
    if (!selected || !body.trim()) return;
    const to = channel === 'sms' ? selected.phone : selected.email;
    if (channel === 'sms' && !isPhone(to)) {
      toast({ title: 'No phone on file', description: `Add a phone number for ${selected.name} to text her.`, variant: 'destructive' });
      return;
    }
    if (channel === 'email' && !isEmail(to)) {
      toast({ title: 'No email on file', description: `Add an email address for ${selected.name} first.`, variant: 'destructive' });
      return;
    }
    setSending(true);
    const res = await sendAndLogMessage({
      channel,
      to,
      subject: channel === 'email' ? (subject || 'A note from your bridal boutique') : undefined,
      body: body.trim(),
      customer: selected.name,
      kind,
    });
    setSending(false);
    if (res.ok) {
      toast({ title: channel === 'sms' ? 'Text sent' : 'Email sent', description: `Delivered to ${to}.` });
    } else {
      toast({
        title: 'Send failed — logged to conversation',
        description: res.error ?? 'Unknown error',
        variant: 'destructive',
      });
    }
    setBody('');
    setSubject('');
    setKind('general');
    loadThread(selected.name);
  };

  /** One-click: send confirmation via every available channel + mark Confirmed. */
  const handleConfirmAppointment = async (apptId: string) => {
    const appt = allAppointments.find((a) => a.id === apptId);
    if (!appt) return;
    const bride = brides.find((b) => b.name === appt.customer);
    setConfirmingId(apptId);
    const tpl = appointmentConfirmationTemplates(appt);
    const results: string[] = [];
    if (bride && isEmail(bride.email)) {
      const r = await sendAndLogMessage({
        channel: 'email',
        to: bride.email,
        subject: tpl.emailSubject,
        body: tpl.emailText,
        html: tpl.emailHtml,
        customer: appt.customer,
        kind: 'confirmation',
      });
      results.push(r.ok ? 'email sent' : 'email failed');
    }
    if (bride && isPhone(bride.phone)) {
      const r = await sendAndLogMessage({
        channel: 'sms',
        to: bride.phone,
        body: tpl.sms,
        customer: appt.customer,
        kind: 'confirmation',
      });
      results.push(r.ok ? 'text sent' : 'text failed');
    }
    await setAppointmentStatus(appt.id, 'Confirmed');
    setConfirmingId(null);
    toast({
      title: 'Appointment confirmed',
      description:
        results.length > 0
          ? `${appt.customer} · ${formatDate(appt.date)} at ${appt.time} — ${results.join(' · ')}.`
          : `${appt.customer} confirmed. No email or phone on file, so no message was sent.`,
    });
    if (selected && selected.name === appt.customer) loadThread(appt.customer);
  };

  /** Manually trigger the automation sweep (reminders / chases / photo emails / digest). */
  const handleRunAutomations = async () => {
    setRunningAuto(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-comms', { body: {} });
      if (error || !data?.ok) {
        toast({ title: 'Automation run failed', description: error?.message ?? data?.error ?? 'Unknown error', variant: 'destructive' });
      } else {
        toast({
          title: 'Automations ran',
          description: `${data.reminders} reminder(s) · ${data.chases} overdue chase(s) · ${data.photos} photo email(s) · digest: ${data.digest ?? 'n/a'}.`,
        });
        if (selected) loadThread(selected.name, false);
      }
    } catch (e: any) {
      toast({ title: 'Automation run failed', description: e?.message ?? 'Network error', variant: 'destructive' });
    }
    setRunningAuto(false);
  };

  /** Persist the morning digest recipient + on/off switch. */
  const handleSaveDigest = async () => {
    if (digestEmail.trim() && !isEmail(digestEmail)) {
      toast({ title: 'Enter a valid email address', variant: 'destructive' });
      return;
    }
    setSavingDigest(true);
    const err = await saveDigestSettings({ email: digestEmail, enabled: digestEnabled });
    setSavingDigest(false);
    if (err) toast({ title: 'Could not save digest settings', description: err, variant: 'destructive' });
    else
      toast({
        title: 'Digest settings saved',
        description: digestEnabled && digestEmail.trim()
          ? `The morning digest will go to ${digestEmail.trim()} every day at 9am.`
          : 'The daily digest is currently off.',
      });
  };

  /** Send today's digest immediately (also saves the recipient first). */
  const handleSendDigestNow = async () => {
    if (!isEmail(digestEmail)) {
      toast({ title: 'Enter a recipient email first', variant: 'destructive' });
      return;
    }
    setSendingDigest(true);
    await saveDigestSettings({ email: digestEmail, enabled: digestEnabled });
    try {
      const { data, error } = await supabase.functions.invoke('auto-comms', {
        body: { task: 'digest', force: true },
      });
      if (error || !data?.ok) {
        toast({ title: 'Digest send failed', description: error?.message ?? data?.error ?? 'Unknown error', variant: 'destructive' });
      } else if (String(data.digest ?? '').startsWith('sent')) {
        toast({ title: 'Digest sent', description: `Today's briefing is on its way to ${digestEmail.trim()}.` });
      } else {
        toast({ title: 'Digest not sent', description: String(data.digest ?? 'Unknown result'), variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Digest send failed', description: e?.message ?? 'Network error', variant: 'destructive' });
    }
    setSendingDigest(false);
  };


  const templateChips: { key: 'confirm' | 'reschedule' | 'payment' | 'chase' | 'reminder'; label: string; icon: typeof CalendarCheck }[] = [
    { key: 'confirm', label: 'Confirm appointment', icon: CalendarCheck },
    { key: 'reschedule', label: 'Reschedule notice', icon: BellRing },
    { key: 'payment', label: 'Payment link', icon: Link2 },
    { key: 'chase', label: 'Overdue chase', icon: AlertCircle },
    { key: 'reminder', label: 'Visit reminder', icon: Sparkles },
  ];

  return (
    <div>
      <PageHeader
        title="Communications"
        subtitle={`Two-way texting and email · ${pendingConfirmations.length} appointment${pendingConfirmations.length === 1 ? '' : 's'} awaiting confirmation`}
      />

      {/* Auto-pilot strip */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-gradient-to-r from-stone-900 to-stone-800 px-5 py-4 text-white shadow-sm">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold">Auto-pilot is on — runs every morning at 9am</p>
            <p className="text-xs text-stone-400">
              Visit reminders 24h before · overdue balances chased every 4 days (max 4) · wedding photo email 2 months after the big day · morning digest to staff · bride replies flow back in below
            </p>
          </div>
        </div>
        <button
          data-tour-id="btn-run-automations"
          onClick={handleRunAutomations}
          disabled={runningAuto}
          className="inline-flex items-center gap-2 rounded-lg bg-status-warning px-4 py-2 text-xs font-semibold text-stone-900 transition-colors hover:bg-amber-400 disabled:opacity-60"
        >
          {runningAuto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          Run now
        </button>
      </div>


      {/* Daily digest settings */}
      <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-status-warning/10 p-2 text-status-warning">
              <Sunrise className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">Morning digest email</p>
              <p className="max-w-md text-xs text-stone-500">
                One email every morning at 9am: today's appointments, overdue balances, gowns awaiting pickup, unsigned contracts, and every bride text from the last 24 hours.
              </p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={digestEmail}
              onChange={(e) => setDigestEmail(e.target.value)}
              placeholder="owner@idobridalcouture.com"
              className={`${inputCls} w-64`}
            />
            <label data-tour-id="label-daily-digest" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600">
              <input
                type="checkbox"
                checked={digestEnabled}
                onChange={(e) => setDigestEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-brand-primary focus:ring-rose-300"
              />
              Send daily
            </label>
            <button
              data-tour-id="btn-save-digest"
              onClick={handleSaveDigest}
              disabled={savingDigest}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-700 disabled:opacity-60"
            >
              {savingDigest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              onClick={handleSendDigestNow}
              disabled={sendingDigest}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-status-warning/10 px-3.5 py-2 text-xs font-semibold text-status-warning transition-colors hover:bg-amber-100 disabled:opacity-60"
            >
              {sendingDigest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send now
            </button>
          </div>
        </div>
      </div>


      {/* Pending confirmations strip */}
      {pendingConfirmations.length > 0 && (
        <div className="mb-6 rounded-2xl border border-status-warning/20 bg-status-warning/10/60 p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-status-warning">
            <BellRing className="h-4 w-4" /> Awaiting confirmation — one click sends the confirmation and updates the calendar
          </p>
          <div className="flex flex-wrap gap-2">
            {pendingConfirmations.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-status-warning/20 bg-white px-3 py-2 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-stone-800">{a.customer}</p>
                  <p className="text-[11px] text-stone-500">
                    {a.type} · {formatDate(a.date)} at {a.time} · {locationById(a.location).short}
                  </p>
                </div>
                <button
                  onClick={() => handleConfirmAppointment(a.id)}
                  disabled={confirmingId === a.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                >
                  {confirmingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Confirm &amp; notify
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Contact list */}
        <div className="rounded-2xl border border-stone-200/80 bg-white shadow-sm lg:col-span-1">
          <div className="border-b border-stone-100 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search brides..."
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
          <div className="max-h-[520px] divide-y divide-stone-100 overflow-y-auto">
            {contacts.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  selectedId === b.id ? 'bg-brand-soft/70' : 'hover:bg-stone-50'
                }`}
              >
                <BridalIdentity customer={b} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-800">{b.name}</p>
                  <p className="truncate text-[11px] text-stone-400">
                    {isPhone(b.phone) ? b.phone : 'no phone'} · {isEmail(b.email) ? b.email : 'no email'}
                  </p>
                </div>
              </button>
            ))}
            {contacts.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-stone-400">No brides match your search.</p>
            )}
          </div>
        </div>

        {/* Conversation + composer + checklist */}
        <div className="space-y-6 lg:col-span-2">
          <div className="flex flex-col rounded-2xl border border-stone-200/80 bg-white shadow-sm">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-5 py-4">
                  <div>
                    <p className="font-serif text-lg text-stone-900">{selected.name}</p>
                    <p className="text-xs text-stone-500">
                      {locationById(selected.location).short} · Wedding {formatDate(selected.weddingDate)}
                      {openInvoiceFor(selected.name) &&
                        ` · Balance ${formatCents(openInvoiceFor(selected.name)!.amountCents - openInvoiceFor(selected.name)!.paidCents)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadThread(selected.name)}
                      title="Refresh conversation"
                      className="rounded-lg border border-stone-200 p-2 text-stone-500 transition-colors hover:border-rose-300 hover:text-brand-primary"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${threadLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex rounded-lg border border-stone-200 p-0.5 bg-stone-50/50">
                      {(['ig', 'fb', 'chat', 'sms', 'email'] as MessageChannel[]).map((c) => (
                        <button
                          key={c}
                          onClick={() => setChannel(c)}
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                            channel === c ? 'bg-white text-stone-900 shadow-sm ring-1 ring-black/5' : 'text-stone-500 hover:text-stone-800'
                          }`}
                        >
                          {c === 'ig' && <Instagram className="h-3.5 w-3.5 text-pink-500" />}
                          {c === 'fb' && <Facebook className="h-3.5 w-3.5 text-status-info" />}
                          {c === 'chat' && <MessageCircle className="h-3.5 w-3.5 text-indigo-500" />}
                          {c === 'sms' && <MessageSquare className="h-3.5 w-3.5" />}
                          {c === 'email' && <Mail className="h-3.5 w-3.5" />}
                          {c === 'ig' ? 'Instagram' : c === 'fb' ? 'Messenger' : c === 'chat' ? 'Live Chat' : c === 'sms' ? 'Text' : 'Email'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Thread — outbound right, inbound bride replies left */}
                <div className="max-h-[300px] flex-1 space-y-3 overflow-y-auto px-5 py-4 bg-stone-50/30">
                  {threadLoading && (
                    <div className="py-8 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-primary" />
                    </div>
                  )}
                  {!threadLoading && thread.length === 0 && (
                    <p className="py-8 text-center text-sm text-stone-400">
                      No messages yet — start the conversation below. Bride replies appear here automatically.
                    </p>
                  )}
                  {!threadLoading &&
                    [...thread].reverse().map((m) =>
                      m.direction === 'inbound' ? (
                        <div key={m.id} className="flex justify-start">
                          <div className={`max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm shadow-sm ring-1 ring-inset ${m.sentiment === 'anxious' || m.sentiment === 'frustrated' ? 'bg-red-50 text-red-900 ring-red-200' : 'bg-white text-stone-800 ring-stone-200'}`}>
                            {m.sentiment === 'anxious' && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 mb-1 uppercase tracking-wider"><AlertCircle className="h-3 w-3" /> Anxious</span>}
                            {m.sentiment === 'frustrated' && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 mb-1 uppercase tracking-wider"><AlertCircle className="h-3 w-3" /> Frustrated</span>}
                            <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-stone-400">
                              {m.channel === 'ig' ? <Instagram className="h-3 w-3 text-pink-500" /> : m.channel === 'fb' ? <Facebook className="h-3 w-3 text-status-info" /> : m.channel === 'chat' ? <MessageCircle className="h-3 w-3 text-indigo-500" /> : <ArrowDownLeft className="h-3 w-3 text-status-success" />}
                              Reply · {m.toAddress} ·{' '}
                              {new Date(m.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div key={m.id} className="flex justify-end">
                          <div
                            className={`max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm shadow-sm ${
                              m.status === 'sent' ? 'bg-stone-900 text-white' : 'bg-brand-soft text-brand-secondary ring-1 ring-inset ring-focus-ring'
                            }`}
                          >
                            {m.subject && <p className="mb-0.5 text-xs font-semibold opacity-80">{m.subject}</p>}
                            <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                            <p className={`mt-1.5 flex items-center gap-1 text-[10px] ${m.status === 'sent' ? 'text-stone-400' : 'text-brand-primary'}`}>
                              {m.status === 'sent' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                              {m.channel === 'ig' ? 'Instagram' : m.channel === 'fb' ? 'Messenger' : m.channel === 'chat' ? 'Live Chat' : m.channel === 'sms' ? 'Text' : 'Email'}
                              {m.kind !== 'general' && ` · ${KIND_LABELS[m.kind] ?? m.kind}`} · {m.toAddress} ·{' '}
                              {new Date(m.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              {m.status === 'failed' && ' · failed'}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                </div>

                {/* Composer */}
                <div className="border-t border-stone-100 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button
                      data-tour-id="btn-magic-reply"
                      onClick={handleMagicReply}
                      disabled={generatingAi}
                      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                    >
                      {generatingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      Magic AI Reply
                    </button>
                    <div className="h-4 w-px bg-stone-200 mx-1"></div>
                    {templateChips.map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        data-tour-id={`template-chip-${key}`}
                        onClick={() => applyTemplate(key)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-rose-300 hover:bg-brand-soft hover:text-brand-primary"
                      >
                        <Icon className="h-3.5 w-3.5" /> {label}
                      </button>
                    ))}
                    {kind !== 'general' && (
                      <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">
                        {KIND_LABELS[kind]}
                        <button onClick={() => setKind('general')} className="text-stone-400 hover:text-white">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                  {channel === 'email' && (
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Subject"
                      className={`${inputCls} mb-2`}
                    />
                  )}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={3}
                      placeholder={
                        channel === 'sms'
                          ? `Text ${selected.name.split(' ')[0]} at ${isPhone(selected.phone) ? selected.phone : '(no phone on file)'}...`
                          : `Email ${selected.name.split(' ')[0]} at ${isEmail(selected.email) ? selected.email : '(no email on file)'}...`
                      }
                      className={`${inputCls} resize-none`}
                    />
                    <button
                      data-tour-id="btn-new-message"
                      onClick={handleSend}
                      disabled={sending || !body.trim()}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-stone-400">
                    Two-way texting is live — replies land in this thread within seconds. Point your Twilio number's inbound webhook at the sms-inbound function to activate.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
                <MessageSquare className="h-8 w-8 text-stone-300" />
                <p className="mt-3 text-sm text-stone-400">Select a bride to view her conversation.</p>
              </div>
            )}
          </div>

          {/* Post-visit checklist */}
          {selected && (
            <BrideChecklist
              bride={selected}
              thread={thread}
              appointments={allAppointments}
              invoices={allInvoices}
              onDraft={handleChecklistDraft}
            />
          )}
        </div>
      </div>
    </div>
  );
}
