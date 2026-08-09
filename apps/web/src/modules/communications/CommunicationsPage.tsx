import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card, CardHeader, CardBody } from '../../design-system/Card';
import { Spinner } from '../../design-system/Spinner';
import { Button } from '../../design-system/Button';
import { PageHeader } from '../../design-system/PageHeader';
import { useToast } from '../../design-system/ToastContext';

export default function CommunicationsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [activeThread, setActiveThread] = useState<any | null>(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/api/leads');
      const leadsList = res.leads || res || [];
      setLeads(leadsList);
      if (leadsList.length > 0) {
        setActiveThread(leadsList[0]);
      }
    } catch (err) {
      console.error('Failed to load leads for communication:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg || !activeThread) return;
    try {
      const payload = {
        phone: activeThread.phone || '+15550000000',
        message: msg
      };
      const data = await api.post<any>('/api/communications/sms', payload);
      addToast(data.mock ? 'Mock SMS Registered successfully!' : `Twilio SMS Sent! SID: ${data.sid}`, 'success');
      setMsg('');
    } catch (err: any) {
      addToast('SMS Gateway Error: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Communication Hub"
          subtitle="Unified Twilio SMS, automated sequences, and email pipelines"
        />
        <Button onClick={() => addToast('Compose Global Broadcast triggered.', 'info')}>
          + Compose Broadcast
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thread List */}
        <Card className="col-span-1">
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Active SMS Threads</h3>
          </CardHeader>
          <CardBody className="p-0 divide-y divide-gray-100">
            {leads.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No active threads found.</p>
            ) : (
              leads.slice(0, 8).map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setActiveThread(lead)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    activeThread?.id === lead.id ? 'bg-rose-50/30 border-l-4 border-rose-500' : ''
                  }`}
                >
                  <div className="text-sm font-bold text-gray-900">
                    {lead.first_name} {lead.last_name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    Thanks! I am so excited for my fitting...
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Thread History & Reply */}
        <Card className="col-span-2 flex flex-col min-h-[450px]">
          {activeThread ? (
            <>
              <CardHeader className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {activeThread.first_name} {activeThread.last_name}
                  </h3>
                  <span className="text-xs text-gray-400">{activeThread.phone || 'No phone number'}</span>
                </div>
              </CardHeader>
              <CardBody className="flex-1 flex flex-col justify-between p-6">
                <div className="space-y-4 overflow-y-auto mb-6 flex-1 min-h-[250px] bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex flex-col gap-2">
                    <div className="self-start bg-white border border-gray-200 text-sm text-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-none max-w-[80%] shadow-sm">
                      Hi! VowOS confirms your appointment for tomorrow at 10 AM. Reply C to confirm.
                    </div>
                    <span className="text-[10px] text-gray-400 self-start ml-2">Sent via Twilio</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="self-end bg-rose-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-none max-w-[80%] shadow-sm">
                      C. Thank you!
                    </div>
                    <span className="text-[10px] text-gray-400 self-end mr-2">Received</span>
                  </div>
                </div>

                <form onSubmit={handleSendSMS} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Type Twilio SMS response..."
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <Button type="submit" variant="primary" className="rounded-full">
                    Send ➣
                  </Button>
                </form>
              </CardBody>
            </>
          ) : (
            <CardBody className="flex-1 flex items-center justify-center text-gray-500">
              Select a thread to view conversation history
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}
