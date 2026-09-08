import React, { useState, useEffect } from 'react';
import UnifiedCommunicationComposer from '@/components/vowos/UnifiedCommunicationComposer';
import UnifiedCommunicationTimeline from '@/components/vowos/UnifiedCommunicationTimeline';
import { fetchMessages, sendAndLogMessage, MessageRecord } from '@/lib/messaging';
import type { Communication } from '@/lib/communications';
import { toast } from 'sonner';

interface AppointmentCommunicationsProps {
  customerId: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  businessId?: string;
  customerName?: string | null;
}

export default function AppointmentCommunications({
  customerId,
  customerPhone,
  customerEmail,
  businessId,
  customerName,
}: AppointmentCommunicationsProps) {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftSubject, setDraftSubject] = useState('');

  useEffect(() => {
    if (!customerId) {
      setLoading(false);
      return;
    }
    
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const msgs = await fetchMessages(customerId);
        if (active) setMessages(msgs);
      } catch (err) {
        console.error('Failed to load communications', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    
    return () => { active = false; };
  }, [customerId]);

  const handleSend = async (channel: 'sms' | 'email' | 'phone', content: string) => {
    if (!customerId) return;
    
    let to = '';
    if (channel === 'sms' || channel === 'phone') {
      to = customerPhone || '';
    } else if (channel === 'email') {
      to = customerEmail || '';
    }

    if (!to) {
      toast.error(`No ${channel} destination address available for this customer.`);
      return;
    }

    setSending(true);
    try {
      const res = await sendAndLogMessage({
        business_id: businessId,
        customer_id: customerId,
        customer: customerId,
        channel: channel === 'phone' ? 'sms' : channel,
        to: to,
        body: content,
        kind: 'general',
      });
      
      if (res.ok) {
        toast.success(`Message sent via ${channel}`);
        // Optimistically reload
        const msgs = await fetchMessages(customerId);
        setMessages(msgs);
        setDraftMessage('');
        setDraftSubject('');
      } else {
        toast.error(`Failed to send message: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      toast.error(`Error sending message: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const timelineCommunications: Communication[] = messages.map(m => ({
    id: m.id,
    thread_id: null,
    direction: m.direction,
    channel: m.channel === 'ig' ? 'system_event' : m.channel === 'fb' ? 'system_event' : m.channel === 'chat' ? 'system_event' : m.channel as 'sms' | 'email' | 'phone',
    sender_id: null,
    sender_name: null,
    recipient_identifier: m.toAddress,
    body: m.body,
    status: m.status,
    is_automated: m.kind !== 'general',
    created_at: m.createdAt,
  }));

  if (!customerId) {
    return <div className="text-sm text-stone-500 italic p-4 border rounded bg-stone-50 text-center">Cannot load communications without a linked customer.</div>;
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex-shrink-0">
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={() => { setDraftSubject('Confirmation'); setDraftMessage(`Hi ${customerName ? customerName.split(' ')[0] : 'there'}, your appointment is confirmed!`); }} className="px-3 py-1 bg-stone-100 hover:bg-stone-200 rounded-full text-xs text-stone-700 transition-colors border border-stone-200">📅 Confirmation</button>
          <button onClick={() => { setDraftSubject('Reminder'); setDraftMessage(`Hi ${customerName ? customerName.split(' ')[0] : 'there'}, this is a reminder for your upcoming appointment.`); }} className="px-3 py-1 bg-stone-100 hover:bg-stone-200 rounded-full text-xs text-stone-700 transition-colors border border-stone-200">🔔 Reminder</button>
          <button onClick={() => { setDraftSubject('Payment Link'); setDraftMessage(`Hi ${customerName ? customerName.split(' ')[0] : 'there'}, here is the link to complete your payment: `); }} className="px-3 py-1 bg-stone-100 hover:bg-stone-200 rounded-full text-xs text-stone-700 transition-colors border border-stone-200">💳 Payment Link</button>
          <button onClick={() => { setDraftSubject('Photos'); setDraftMessage(`Hi ${customerName ? customerName.split(' ')[0] : 'there'}, could you please send us some reference photos?`); }} className="px-3 py-1 bg-stone-100 hover:bg-stone-200 rounded-full text-xs text-stone-700 transition-colors border border-stone-200">📸 Photos</button>
          <button onClick={() => { setDraftSubject('General Check-in'); setDraftMessage(`Hi ${customerName ? customerName.split(' ')[0] : 'there'}, just checking in. Let us know if you need anything!`); }} className="px-3 py-1 bg-stone-100 hover:bg-stone-200 rounded-full text-xs text-stone-700 transition-colors border border-stone-200">👋 General Check-in</button>
        </div>
        <UnifiedCommunicationComposer 
          onSend={handleSend} 
          isSending={sending} 
          defaultContent={draftMessage}
          defaultSubject={draftSubject}
          setContent={setDraftMessage}
          setSubject={setDraftSubject}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <span className="text-stone-400 text-sm animate-pulse">Loading thread...</span>
          </div>
        ) : (
          <UnifiedCommunicationTimeline communications={timelineCommunications} />
        )}
      </div>
    </div>
  );
}
