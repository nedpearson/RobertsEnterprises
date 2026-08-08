import { useEffect, useState } from 'react';
import { MessageSquare, Loader2, RefreshCw, Send, CheckCircle2, Edit3, Eye } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { inputCls } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@/components/ui/switch';
import { resolveEffectiveSetting, saveScopedSetting, DEFAULT_TWILIO_SETTINGS, TwilioSettings } from '@/lib/settings';
import { getActiveDataPlane, supabase } from '@/lib/supabase';

interface ChannelConfig {
  emailSender: string;
  senderDisplayName: string;
  replyTo: string;
  smsConsentText: string;
}

const DEFAULT_CHANNEL_CONFIG: ChannelConfig = {
  emailSender: 'notifications@robertsenterprises.com',
  senderDisplayName: 'The Boutique Bridal',
  replyTo: 'support@robertsenterprises.com',
  smsConsentText: 'Reply STOP to unsubscribe. Msg & data rates may apply.',
};

interface MessageTemplate {
  id: string;
  name: string;
  channel: 'SMS' | 'Email';
  subject?: string;
  body: string;
  active: boolean;
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  { id: '1', name: 'Booking Created Confirmation', channel: 'Email', subject: 'Your Bridal Consultation at The Boutique', body: 'Hi {bride_name}, your appointment is confirmed for {appointment_date} at {location_name}. We look forward to helping you find your dream gown!', active: true },
  { id: '2', name: 'Booking Fee Invoice Request', channel: 'SMS', body: 'Hi {bride_name}, your VIP styling consultation requires a $75 booking fee reservation. Please finalize payment here: {payment_link}', active: true },
  { id: '3', name: '7-Day Appointment Reminder', channel: 'SMS', body: 'Hi {bride_name}, this is a reminder of your bridal styling consultation next week on {appointment_date} at {location_name}. Reply YES to confirm.', active: true },
  { id: '4', name: 'Alterations Completed pickup', channel: 'Email', subject: 'Your gown alterations are complete!', body: 'Dear {bride_name}, your gown alterations are finalized and passed quality inspection. Book a pickup appointment here: {pickup_link}', active: true },
];

interface CommunicationsSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function CommunicationsSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: CommunicationsSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [twilio, setTwilio] = useState<TwilioSettings>(DEFAULT_TWILIO_SETTINGS);
  const [dbTwilio, setDbTwilio] = useState<TwilioSettings>(DEFAULT_TWILIO_SETTINGS);
  const [channel, setChannel] = useState<ChannelConfig>(DEFAULT_CHANNEL_CONFIG);
  const [dbChannel, setDbChannel] = useState<ChannelConfig>(DEFAULT_CHANNEL_CONFIG);
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [dbTemplates, setDbTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);

  const [testingConnection, setTestingConnection] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>('1');
  const [testSendPhoneEmail, setTestSendPhoneEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    
    const twilioResult = await resolveEffectiveSetting<TwilioSettings>(
      'twilio_settings',
      'twilio_settings',
      { dataPlane },
      DEFAULT_TWILIO_SETTINGS
    );
    const channelResult = await resolveEffectiveSetting<ChannelConfig>(
      'channel_settings',
      'channel_settings',
      { dataPlane },
      DEFAULT_CHANNEL_CONFIG
    );
    const templatesResult = await resolveEffectiveSetting<MessageTemplate[]>(
      'message_templates',
      'message_templates',
      { dataPlane },
      DEFAULT_TEMPLATES
    );
    
    setTwilio(twilioResult.value);
    setDbTwilio(twilioResult.value);
    setChannel(channelResult.value);
    setDbChannel(channelResult.value);
    setTemplates(templatesResult.value);
    setDbTemplates(templatesResult.value);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger]);

  const isDirty =
    JSON.stringify(twilio) !== JSON.stringify(dbTwilio) ||
    JSON.stringify(channel) !== JSON.stringify(dbChannel) ||
    JSON.stringify(templates) !== JSON.stringify(dbTemplates);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (reason?: string): Promise<boolean> => {
    try {
      const dataPlane = getActiveDataPlane();
      
      await saveScopedSetting('twilio_settings', 'twilio_settings', twilio, { dataPlane }, reason);
      await saveScopedSetting('channel_settings', 'channel_settings', channel, { dataPlane }, reason);
      await saveScopedSetting('message_templates', 'message_templates', templates, { dataPlane }, reason);

      toast({
        title: 'Communications settings saved',
        description: 'Twilio integration, channel defaults, and message templates updated.',
      });
      
      setDbTwilio(twilio);
      setDbChannel(channel);
      setDbTemplates(templates);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save communications settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [twilio, channel, templates]);

  const testTwilioConnection = async () => {
    setTestingConnection(true);
    try {
      const { error } = await supabase.rpc('test_twilio_connection');
      if (error) throw error;
      toast({
        title: 'Twilio connection verified',
        description: 'Webhook callbacks are functioning successfully.',
      });
    } catch (err: any) {
      toast({
        title: 'Twilio connection failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTemplateChange = (id: string, fields: Partial<MessageTemplate>) => {
    setTemplates(
      templates.map((t) => (t.id === id ? { ...t, ...fields } as typeof t : t))
    );
  };

  const selectedTemplate = templates.find((t) => t.id === activeTemplateId);

  const getResolvedPreview = (body: string) => {
    return body
      .replace('{bride_name}', 'Sarah Jenkins')
      .replace('{appointment_date}', 'July 27, 2026 at 2:00 PM')
      .replace('{location_name}', 'Baton Rouge Salon')
      .replace('{payment_link}', 'https://pay.vowos.com/bk_784x')
      .replace('{pickup_link}', 'https://book.vowos.com/pickup_90f');
  };

  const sendTestTemplate = async () => {
    if (!testSendPhoneEmail.trim() || !selectedTemplate) {
      toast({ title: 'Enter recipient details first', variant: 'destructive' });
      return;
    }
    setSendingTest(true);
    try {
      const { error } = await supabase.rpc('send_test_template', { 
        recipient: testSendPhoneEmail, 
        template_id: selectedTemplate.id 
      });
      if (error) throw error;
      toast({
        title: 'Test dispatch triggered',
        description: `Test message for "${selectedTemplate.name}" successfully sent to ${testSendPhoneEmail}.`,
      });
      setTestSendPhoneEmail('');
    } catch (err: any) {
      toast({
        title: 'Test dispatch failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading communication channels…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard
          title="Twilio Gateway Connection"
          description="Status of inbound callback validation on Twilio."
          icon={<MessageSquare className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <SettingsField
              label="Messaging Service SID"
              description="Twilio SID for SMS gateway integrations."
            >
              <input
                type="text"
                value={twilio.messagingServiceSid}
                onChange={(e) => setTwilio({ ...twilio, messagingServiceSid: e.target.value })}
                className={inputCls}
                placeholder="e.g. MGXXXXXXXXXXXXXXXX"
              />
            </SettingsField>

            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-emerald-700">Twilio Webhook Active</span>
              </div>
              <button
                onClick={testTwilioConnection}
                disabled={testingConnection}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                <RefreshCw className={`h-3 w-3 ${testingConnection ? 'animate-spin' : ''}`} />
                Test Connection
              </button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Email & SMS Channel Defaults"
          description="Configure outbound domains and consent unsubscribe footers."
          icon={<MessageSquare className="h-5 w-5" />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsField label="Sender Email">
              <input
                type="email"
                value={channel.emailSender}
                onChange={(e) => setChannel({ ...channel, emailSender: e.target.value })}
                className={inputCls}
              />
            </SettingsField>

            <SettingsField label="Outbound Display Name">
              <input
                type="text"
                value={channel.senderDisplayName}
                onChange={(e) => setChannel({ ...channel, senderDisplayName: e.target.value })}
                className={inputCls}
              />
            </SettingsField>

            <SettingsField label="Reply-To Address" className="sm:col-span-2">
              <input
                type="email"
                value={channel.replyTo}
                onChange={(e) => setChannel({ ...channel, replyTo: e.target.value })}
                className={inputCls}
              />
            </SettingsField>
          </div>
        </SettingsCard>
      </div>

      <SettingsCard
        title="Outbound Notification Templates"
        description="Edit automated message content, evaluate parameters, and send test logs."
        icon={<MessageSquare className="h-5 w-5" />}
      >
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left panel: templates list */}
          <div className="space-y-2 border-r border-stone-100 pr-4 md:col-span-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-2">Message Templates</span>
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setActiveTemplateId(tpl.id)}
                className={`flex w-full flex-col p-3 rounded-xl border text-left transition-all ${
                  activeTemplateId === tpl.id
                    ? 'border-rose-300 bg-rose-50/30'
                    : 'border-stone-200 hover:bg-stone-50/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-stone-800 truncate pr-2">{tpl.name}</span>
                  <span className="text-[9px] font-bold bg-stone-100 px-1 rounded text-stone-500 uppercase flex-shrink-0">
                    {tpl.channel}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 truncate mt-1">{tpl.body}</p>
              </button>
            ))}
          </div>

          {/* Right panel: editor & preview */}
          {selectedTemplate ? (
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h5 className="text-sm font-semibold text-stone-800">Edit Template: {selectedTemplate.name}</h5>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">Active</span>
                  <Switch
                    checked={selectedTemplate.active}
                    onCheckedChange={(checked) => handleTemplateChange(selectedTemplate.id, { active: checked })}
                    className="scale-90 data-[state=checked]:bg-rose-500"
                  />
                </div>
              </div>

              {selectedTemplate.channel === 'Email' && (
                <SettingsField label="Email Subject Header">
                  <input
                    type="text"
                    value={selectedTemplate.subject || ''}
                    onChange={(e) => handleTemplateChange(selectedTemplate.id, { subject: e.target.value })}
                    className={inputCls}
                  />
                </SettingsField>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-stone-600 block">Message Body</span>
                  <textarea
                    value={selectedTemplate.body}
                    onChange={(e) => handleTemplateChange(selectedTemplate.id, { body: e.target.value })}
                    className={`${inputCls} min-h-[140px] py-2 text-xs`}
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['{bride_name}', '{appointment_date}', '{location_name}', '{payment_link}', '{pickup_link}'].map((v) => (
                      <button
                        key={v}
                        onClick={() => handleTemplateChange(selectedTemplate.id, { body: selectedTemplate.body + ' ' + v })}
                        className="text-[9px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 bg-stone-50/50 p-4 border border-stone-200/80 rounded-xl">
                  <div className="flex items-center gap-1.5 text-stone-600 border-b border-stone-200/80 pb-2">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs font-semibold">Live Preview</span>
                  </div>
                  {selectedTemplate.channel === 'Email' && (
                    <div className="text-[10px] text-stone-500">
                      <span className="font-semibold block">Subject:</span>
                      <p className="mt-0.5 bg-white p-2 border border-stone-200 rounded">{selectedTemplate.subject || 'No Subject Specified'}</p>
                    </div>
                  )}
                  <div className="text-[10px] text-stone-500">
                    <span className="font-semibold block">Content Body:</span>
                    <p className="mt-0.5 bg-white p-2 border border-stone-200 rounded min-h-[70px] whitespace-pre-wrap leading-relaxed">
                      {getResolvedPreview(selectedTemplate.body)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 items-end pt-3 border-t border-stone-100">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={selectedTemplate.channel === 'Email' ? 'test@email.com' : '+1 (555) 555-5555'}
                    value={testSendPhoneEmail}
                    onChange={(e) => setTestSendPhoneEmail(e.target.value)}
                    className={`${inputCls} h-9 text-xs`}
                  />
                </div>
                <button
                  onClick={sendTestTemplate}
                  disabled={sendingTest}
                  className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 h-9 text-xs font-semibold text-white hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" /> Dispatch test
                </button>
              </div>
            </div>
          ) : (
            <div className="md:col-span-2 flex items-center justify-center border border-dashed border-stone-200 rounded-xl p-8 text-stone-400 italic">
              Select a template to view details and edit values.
            </div>
          )}
        </div>
      </SettingsCard>
    </div>
  );
}
