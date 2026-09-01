import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Mail, MessageSquare, RefreshCw, Search, Send, Smartphone } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { jsonBody, vowosApi } from '@/lib/api/vowosApi';

interface InboxCustomer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  sms_opt_in?: boolean | null;
  sms_consent?: boolean | null;
  email_consent?: boolean | null;
  status?: string | null;
}

interface InboxMessage {
  id: string;
  customer_id?: string | null;
  customer?: string | null;
  sender?: string | null;
  content?: string | null;
  body?: string | null;
  subject?: string | null;
  channel?: string | null;
  direction?: string | null;
  status?: string | null;
  external_id?: string | null;
  to_address?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
}

interface InboxResponse {
  messages: InboxMessage[];
  customers: InboxCustomer[];
}

type ComposeChannel = 'sms' | 'email';

const panel = 'rounded-2xl border border-stone-200 bg-white shadow-sm';

function timestamp(message: InboxMessage): number {
  const value = message.sent_at || message.created_at;
  return value ? new Date(value).getTime() : 0;
}

function displayTime(message: InboxMessage): string {
  const value = message.sent_at || message.created_at;
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function bodyOf(message: InboxMessage): string {
  return message.body || message.content || '';
}

function channelLabel(channel?: string | null): string {
  const normalized = String(channel || '').toLowerCase();
  if (normalized === 'sms') return 'SMS';
  if (normalized === 'email') return 'Email';
  if (normalized.includes('instagram')) return 'Instagram';
  if (normalized.includes('facebook') || normalized.includes('messenger')) return 'Facebook';
  return normalized ? normalized.replace(/_/g, ' ') : 'Message';
}

export default function CommunicationsView() {
  const { profile } = useAuth();
  const canSend = profile?.role !== 'Seamstress';
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [customers, setCustomers] = useState<InboxCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState<ComposeChannel>('sms');
  const [subject, setSubject] = useState('');
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = async (preserveSelection = true) => {
    setLoading(true);
    try {
      const response = await vowosApi<InboxResponse>('/api/organization/communications/messages');
      const nextMessages = response.messages ?? [];
      const nextCustomers = response.customers ?? [];
      setMessages(nextMessages);
      setCustomers(nextCustomers);

      if (!preserveSelection || !selectedCustomerId || !nextCustomers.some((customer) => customer.id === selectedCustomerId)) {
        const mostRecentCustomerId = [...nextMessages]
          .sort((a, b) => timestamp(b) - timestamp(a))
          .find((message) => message.customer_id)?.customer_id;
        setSelectedCustomerId(mostRecentCustomerId || nextCustomers[0]?.id || '');
      }
    } catch (cause) {
      toast({
        title: 'Could not load Unified Inbox',
        description: cause instanceof Error ? cause.message : 'Unknown API error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(false); }, []);

  const threads = useMemo(() => customers.map((customer) => {
    const customerMessages = messages.filter((message) => message.customer_id === customer.id).sort((a, b) => timestamp(a) - timestamp(b));
    const last = customerMessages.at(-1) ?? null;
    return { customer, messages: customerMessages, last, lastAt: last ? timestamp(last) : 0 };
  }).sort((a, b) => b.lastAt - a.lastAt || a.customer.name.localeCompare(b.customer.name)), [customers, messages]);

  const filteredThreads = threads.filter(({ customer, last }) => {
    const haystack = [customer.name, customer.email, customer.phone, last ? bodyOf(last) : ''].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const selectedThread = threads.find((thread) => thread.customer.id === selectedCustomerId) ?? null;
  const selectedCustomer = selectedThread?.customer ?? null;

  useEffect(() => {
    if (!selectedCustomer) return;
    if (channel === 'sms' && !selectedCustomer.phone && selectedCustomer.email) setChannel('email');
    if (channel === 'email' && !selectedCustomer.email && selectedCustomer.phone) setChannel('sms');
  }, [selectedCustomerId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [selectedCustomerId, selectedThread?.messages.length]);

  const send = async () => {
    if (!selectedCustomer || !draft.trim()) return;
    if (channel === 'email' && !subject.trim()) {
      toast({ title: 'Email subject is required', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const response = channel === 'sms'
        ? await vowosApi<{ message: InboxMessage }>('/api/organization/communications/send-sms', {
            method: 'POST',
            body: jsonBody({ customer_id: selectedCustomer.id, body: draft.trim() }),
          })
        : await vowosApi<{ message: InboxMessage }>('/api/organization/communications/send-email', {
            method: 'POST',
            body: jsonBody({ customer_id: selectedCustomer.id, subject: subject.trim(), body: draft.trim() }),
          });

      setMessages((current) => [...current.filter((message) => message.id !== response.message.id), response.message]);
      setDraft('');
      if (channel === 'email') setSubject('');
      toast({ title: channel === 'sms' ? 'SMS sent' : 'Email sent', description: `Message delivered to ${selectedCustomer.name} and written to the communication history.` });
    } catch (cause) {
      toast({
        title: channel === 'sms' ? 'SMS failed' : 'Email failed',
        description: cause instanceof Error ? cause.message : 'Unknown provider error',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className={`${panel} flex min-h-[420px] items-center justify-center gap-3 text-sm text-stone-500`}><Loader2 className="h-5 w-5 animate-spin" />Loading Unified Inbox…</div>;
  }

  return (
    <div className={`${panel} overflow-hidden`}>
      <div className="grid min-h-[650px] lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="border-b border-stone-200 bg-stone-50/60 lg:border-b-0 lg:border-r">
          <div className="border-b border-stone-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-stone-900"><MessageSquare className="h-5 w-5 text-brand-primary" />Unified Inbox</h2>
                <p className="text-xs text-stone-500">Live tenant message history</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void load()} aria-label="Refresh inbox"><RefreshCw className="h-4 w-4" /></Button>
            </div>
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search brides or messages" className="pl-9" /></div>
          </div>

          <div className="max-h-[585px] overflow-y-auto p-2">
            {filteredThreads.map(({ customer, last }) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => setSelectedCustomerId(customer.id)}
                className={`mb-1 w-full rounded-xl p-3 text-left transition-colors ${selectedCustomerId === customer.id ? 'bg-white shadow-sm ring-1 ring-stone-200' : 'hover:bg-white/80'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold text-stone-900">{customer.name}</p>
                  {last && <span className="shrink-0 text-[10px] text-stone-400">{displayTime(last)}</span>}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-500">
                  {last?.channel === 'email' ? <Mail className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                  <span className="truncate">{last ? bodyOf(last) : customer.email || customer.phone || 'No messages yet'}</span>
                </div>
              </button>
            ))}
            {!filteredThreads.length && <p className="p-6 text-center text-sm text-stone-400">No customers or messages match this search.</p>}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          {selectedCustomer ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-stone-900">{selectedCustomer.name}</h3>
                  <p className="truncate text-xs text-stone-500">{[selectedCustomer.phone, selectedCustomer.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className={`rounded-full px-2 py-1 font-semibold ${(selectedCustomer.sms_opt_in || selectedCustomer.sms_consent) ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>SMS {(selectedCustomer.sms_opt_in || selectedCustomer.sms_consent) ? 'CONSENTED' : 'OFF'}</span>
                  <span className={`rounded-full px-2 py-1 font-semibold ${selectedCustomer.email_consent ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>EMAIL {selectedCustomer.email_consent ? 'CONSENTED' : 'OFF'}</span>
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-stone-50/40 p-4 sm:p-5">
                {selectedThread?.messages.map((message) => {
                  const outbound = String(message.direction || '').toLowerCase() === 'outbound';
                  return (
                    <div key={message.id} className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${outbound ? 'bg-stone-900 text-white' : 'border border-stone-200 bg-white text-stone-800'}`}>
                        <div className={`mb-1 flex flex-wrap items-center gap-2 text-[10px] ${outbound ? 'text-stone-300' : 'text-stone-400'}`}>
                          <span className="font-semibold uppercase tracking-wide">{channelLabel(message.channel)}</span>
                          {message.subject && <span>· {message.subject}</span>}
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{bodyOf(message)}</p>
                        <div className={`mt-2 flex items-center justify-end gap-1.5 text-[10px] ${outbound ? 'text-stone-300' : 'text-stone-400'}`}>
                          {outbound && String(message.status || '').toLowerCase() === 'sent' && <CheckCircle2 className="h-3 w-3" />}
                          {displayTime(message)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!selectedThread?.messages.length && <div className="flex min-h-56 items-center justify-center text-center text-sm text-stone-400">No messages yet. Start the conversation below.</div>}
                <div ref={endRef} />
              </div>

              <div className="border-t border-stone-200 bg-white p-4">
                {canSend ? (
                  <>
                    <div className="mb-3 flex gap-2">
                      <Button variant={channel === 'sms' ? 'default' : 'outline'} size="sm" onClick={() => setChannel('sms')} disabled={!selectedCustomer.phone}><Smartphone className="mr-2 h-4 w-4" />SMS</Button>
                      <Button variant={channel === 'email' ? 'default' : 'outline'} size="sm" onClick={() => setChannel('email')} disabled={!selectedCustomer.email}><Mail className="mr-2 h-4 w-4" />Email</Button>
                    </div>
                    {channel === 'email' && <Input className="mb-2" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" />}
                    <div className="flex items-end gap-2">
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        rows={3}
                        maxLength={channel === 'sms' ? 1600 : 20000}
                        placeholder={channel === 'sms' ? 'Type an SMS…' : 'Type an email…'}
                        className="min-h-[76px] flex-1 resize-y rounded-xl border border-stone-300 bg-white p-3 text-sm outline-none focus:border-brand-primary"
                      />
                      <Button onClick={() => void send()} disabled={sending || !draft.trim()} className="h-11 shrink-0">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        <span className="sr-only">Send message</span>
                      </Button>
                    </div>
                    <p className="mt-2 text-[11px] text-stone-400">Messages are sent through the configured provider and persisted to this organization's communication history.</p>
                  </>
                ) : <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">Your role can view customer communications but cannot send them.</p>}
              </div>
            </>
          ) : <div className="flex min-h-[650px] items-center justify-center text-sm text-stone-500">Select a customer conversation.</div>}
        </section>
      </div>
    </div>
  );
}
