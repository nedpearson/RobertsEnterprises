import React, { useState } from 'react';
import { Send, Phone, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@vowos/design-system';
import { Textarea } from '@vowos/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@vowos/design-system';

interface UnifiedCommunicationComposerProps {
  onSend: (channel: 'sms' | 'email' | 'phone', content: string) => Promise<void>;
  isSending: boolean;
}

export default function UnifiedCommunicationComposer({ onSend, isSending }: UnifiedCommunicationComposerProps) {
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState<'sms' | 'email' | 'phone'>('sms');

  const handleSend = async () => {
    if (!content.trim()) return;
    await onSend(channel, content);
    setContent('');
  };

  return (
    <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
      <Tabs value={channel} onValueChange={(v) => setChannel(v as any)} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-stone-50/50 p-0 h-auto">
          <TabsTrigger value="sms" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-brand-primary py-3 px-4">
            <MessageSquare className="w-4 h-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="email" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-brand-primary py-3 px-4">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="phone" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-brand-primary py-3 px-4">
            <Phone className="w-4 h-4 mr-2" />
            Log Call
          </TabsTrigger>
        </TabsList>
        <div className="p-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              channel === 'sms' ? 'Type text message...' :
              channel === 'email' ? 'Type email content...' :
              'Log call notes...'
            }
            className="min-h-[100px] border-0 focus-visible:ring-0 resize-none p-2"
          />
        </div>
        <div className="p-3 bg-stone-50 border-t flex justify-between items-center">
          <div className="text-xs text-stone-500">
            {channel === 'sms' ? '160 characters per segment' :
             channel === 'email' ? 'Supports markdown formatting' :
             'Internal eyes only'}
          </div>
          <Button onClick={handleSend} disabled={!content.trim() || isSending} size="sm" className="bg-brand-primary-hover hover:bg-rose-700">
            <Send className="w-4 h-4 mr-2" />
            {channel === 'phone' ? 'Save Log' : 'Send'}
          </Button>
        </div>
      </Tabs>
    </div>
  );
}
