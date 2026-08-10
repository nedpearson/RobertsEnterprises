import { useState } from 'react';
import { Copy, Check, Mail, MessageSquare, Loader2, ExternalLink, Link2 } from 'lucide-react';
import { Invoice, formatCents, formatDate, locationById } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { toast } from '@vowos/design-system';
import { Modal, inputCls } from './ui';
import { paymentLinkUrl, paymentLinkTemplates, sendAndLogMessage, isEmail, isPhone } from '@/lib/messaging';

export default function PaymentLinkModal({
  invoice,
  onClose,
}: {
  invoice: Invoice | null;
  onClose: () => void;
}) {
  const { allBrides } = useVowosData();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState<'email' | 'sms' | null>(null);

  if (!invoice) return null;

  const url = paymentLinkUrl(invoice);
  const balance = invoice.amountCents - invoice.paidCents;
  const bride = allBrides.find((b) => b.name === invoice.customer) ?? null;
  const tpl = paymentLinkTemplates(invoice);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Select the link text and copy it manually.', variant: 'destructive' });
    }
  };

  const handleSend = async (channel: 'email' | 'sms') => {
    const to = channel === 'email' ? bride?.email ?? '' : bride?.phone ?? '';
    setSending(channel);
    const res = await sendAndLogMessage({
      channel,
      to,
      subject: channel === 'email' ? tpl.emailSubject : undefined,
      body: channel === 'email' ? tpl.emailText : tpl.sms,
      html: channel === 'email' ? tpl.emailHtml : undefined,
      customer: invoice.customer,
      kind: 'payment',
    });
    setSending(null);
    if (res.ok) {
      toast({ title: channel === 'email' ? 'Payment link emailed' : 'Payment link texted', description: `Sent to ${to}.` });
    } else {
      toast({ title: 'Send failed — logged to conversation', description: res.error ?? 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Payment Link">
      <div className="space-y-4">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-800">{invoice.id} · {invoice.customer}</p>
              <p className="text-xs text-stone-500">{invoice.description} · {locationById(invoice.location).short}</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-xl text-stone-900">{formatCents(balance)}</p>
              <p className="text-[11px] text-stone-400">due {formatDate(invoice.dueDate)}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-stone-500">
            <Link2 className="h-3.5 w-3.5" /> Secure hosted payment page
          </p>
          <div className="flex gap-2">
            <input readOnly value={url} className={`${inputCls} text-xs`} onFocus={(e) => e.target.select()} />
            <button
              onClick={handleCopy}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-status-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:text-brand-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Preview the payment page
          </a>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            onClick={() => handleSend('email')}
            disabled={!bride || !isEmail(bride.email) || sending !== null}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-40"
          >
            {sending === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Email the link
          </button>
          <button
            onClick={() => handleSend('sms')}
            disabled={!bride || !isPhone(bride.phone) || sending !== null}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-40"
          >
            {sending === 'sms' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            Text the link
          </button>
        </div>
        {!bride && (
          <p className="text-[11px] text-stone-400">
            {invoice.customer} isn't in the Brides directory, so the link can only be copied and shared manually.
          </p>
        )}
        {bride && (
          <p className="text-[11px] text-stone-400">
            {isEmail(bride.email) ? `Email: ${bride.email}` : 'No email on file'} ·{' '}
            {isPhone(bride.phone) ? `Phone: ${bride.phone}` : 'No phone on file'} — payments made on the
            page post to this invoice automatically.
          </p>
        )}
      </div>
    </Modal>
  );
}
