// ─── Post-Visit Checklist ───
// Three follow-through items per bride, tracked from her conversation log:
// 1. AI thank-you note grounded in everything done during her appointments
// 2. AI-written review request text
// 3. Wedding photo email (the "I Do Team" template) — auto-sends 2 months
//    after the wedding via the nightly automation, or can be sent early.

import { useMemo, useState, type ReactNode } from 'react';

import { CheckCircle2, Circle, Loader2, Sparkles, Star, Camera, ListChecks } from 'lucide-react';
import { Appointment, Customer, Invoice, formatDate, locationById } from '@/data/vowosData';

import { toast } from '@/components/ui/use-toast';
import {
  MessageChannel,
  MessageKind,
  MessageRecord,
  buildBrideContext,
  generateAiNote,
  weddingPhotoTemplates,
  isEmail,
  isPhone,
} from '@/lib/messaging';

export interface ChecklistDraft {
  kind: MessageKind;
  channel: MessageChannel;
  subject: string;
  body: string;
}

interface BrideChecklistProps {
  bride: Customer;
  thread: MessageRecord[];
  appointments: Appointment[];
  invoices: Invoice[];
  /** Loads a draft into the composer so staff can review + edit before sending. */
  onDraft: (draft: ChecklistDraft) => void;
}

function photoSendDate(weddingIso?: string): string {
  if (!weddingIso) return new Date().toISOString().slice(0, 10);
  try {
    const d = new Date(weddingIso.slice(0, 10) + 'T12:00:00');
    d.setMonth(d.getMonth() + 2);
    return d.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default function BrideChecklist({ bride, thread, appointments, invoices, onDraft }: BrideChecklistProps) {
  const [busy, setBusy] = useState<'thank_you' | 'review' | null>(null);

  const sentKinds = useMemo(() => {
    const s = new Set<MessageKind>();
    thread.forEach((m) => {
      if (m.direction === 'outbound' && m.status === 'sent') s.add(m.kind);
    });
    return s;
  }, [thread]);

  const preferredChannel: MessageChannel = isPhone(bride.phone) ? 'sms' : 'email';
  const photoDue = photoSendDate(bride.weddingDate);
  const todayIso = new Date().toISOString().slice(0, 10);

  const handleAi = async (mode: 'thank_you' | 'review') => {
    const channel: MessageChannel = mode === 'review' ? 'sms' : preferredChannel;
    if (channel === 'sms' && !isPhone(bride.phone) && mode === 'review') {
      toast({ title: 'No phone on file', description: `Add a phone number for ${bride.name} to text a review request.`, variant: 'destructive' });
      return;
    }
    setBusy(mode);
    const context = buildBrideContext(bride, appointments, invoices);
    const res = await generateAiNote(mode, context, channel);
    setBusy(null);
    if (!res.ok) {
      toast({ title: 'AI could not write the note', description: res.error ?? 'Try again in a moment.', variant: 'destructive' });
      return;
    }
    onDraft({
      kind: mode,
      channel,
      subject: mode === 'thank_you' ? `Thank you, ${bride.name.split(' ')[0]} — from ${locationById(bride.location).business}` : '',

      body: res.text,
    });
    toast({
      title: mode === 'thank_you' ? 'Thank-you note drafted' : 'Review request drafted',
      description: 'Loaded into the composer — review, tweak, and hit Send.',
    });
  };

  const loadPhotoTemplate = () => {
    const tpl = weddingPhotoTemplates(bride);
    const channel: MessageChannel = isEmail(bride.email) ? 'email' : 'sms';
    onDraft({
      kind: 'photo',
      channel,
      subject: tpl.emailSubject,
      body: channel === 'email' ? tpl.emailText : tpl.sms,
    });
    toast({ title: 'Photo email loaded', description: 'The I Do Team template is in the composer — send when ready.' });
  };

  const items: {
    key: 'thank_you' | 'review' | 'photo';
    icon: typeof Sparkles;
    title: string;
    detail: string;
    done: boolean;
    action: ReactNode;

  }[] = [
    {
      key: 'thank_you',
      icon: Sparkles,
      title: 'Send an AI thank-you note',
      detail: `Written from everything on file — her ${appointments.filter((a) => a.customer === bride.name).length} visit(s), ${bride.stylist}, and her purchases.`,
      done: sentKinds.has('thank_you'),
      action: (
        <button
          onClick={() => handleAi('thank_you')}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-700 disabled:opacity-50"
        >
          {busy === 'thank_you' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Write with AI
        </button>
      ),
    },
    {
      key: 'review',
      icon: Star,
      title: 'Ask for a review by text',
      detail: `AI writes a personal text mentioning ${bride.stylist} and her visit, then asks for a Google review.`,
      done: sentKinds.has('review'),
      action: (
        <button
          onClick={() => handleAi('review')}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-amber-400 hover:text-amber-700 disabled:opacity-50"
        >
          {busy === 'review' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
          Write with AI
        </button>
      ),
    },
    {
      key: 'photo',
      icon: Camera,
      title: 'Wedding photo email',
      detail:
        photoDue <= todayIso
          ? `Was scheduled for ${formatDate(photoDue)} (2 months after the wedding) — the nightly automation sends it, or send now.`
          : `Auto-sends ${formatDate(photoDue)} — 2 months after her ${formatDate(bride.weddingDate)} wedding. No action needed.`,
      done: sentKinds.has('photo'),
      action: (
        <button
          onClick={loadPhotoTemplate}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-rose-300 hover:text-rose-600"
        >
          <Camera className="h-3.5 w-3.5" /> Load template
        </button>
      ),
    },
  ];

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
          <ListChecks className="h-4 w-4 text-amber-600" /> Post-visit checklist — {bride.name.split(' ')[0]}
        </p>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${doneCount === items.length ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {doneCount}/{items.length} complete
        </span>
      </div>
      <div className="divide-y divide-stone-100">
        {items.map(({ key, icon: Icon, title, detail, done, action }) => (
          <div key={key} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            {done ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
            ) : (
              <Circle className="h-5 w-5 flex-shrink-0 text-stone-300" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`flex items-center gap-1.5 text-sm font-medium ${done ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                <Icon className="h-3.5 w-3.5 text-stone-400" /> {title}
              </p>
              <p className="text-[11px] leading-snug text-stone-400">{detail}</p>
            </div>
            {done ? (
              <span className="text-[11px] font-medium text-emerald-600">Sent</span>
            ) : (
              action
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
