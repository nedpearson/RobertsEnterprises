import React, { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card } from '../../design-system/Card';
import { Spinner } from '../../design-system/Spinner';
import { Button } from '../../design-system/Button';
import { PageHeader } from '../../design-system/PageHeader';
import { DataTable } from '../../design-system/DataTable';
import { Modal } from '../../design-system/Modal';
import { useToast } from '../../design-system/ToastContext';

export default function LeadsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leadsSummary, setLeadsSummary] = useState<any[]>([]);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/api/leads');
      setLeads(res.leads || res || []);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketingData = async () => {
    try {
      const campRes = await api.get<{ campaigns: any[] }>('/api/marketing/campaigns');
      const sumRes = await api.get<{ summary: any[] }>('/api/marketing/leads-summary');
      setCampaigns(campRes.campaigns || []);
      setLeadsSummary(sumRes.summary || []);
    } catch (err) {
      console.error('Failed to load marketing analytics:', err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchMarketingData();
  }, []);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/leads', leadForm);
      setIsLeadModalOpen(false);
      setLeadForm({ first_name: '', last_name: '', email: '', phone: '' });
      fetchLeads();
      addToast('Lead captured successfully.', 'success');
    } catch (err: any) {
      addToast('Error saving lead: ' + err.message, 'error');
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
          title="Leads & Prospects"
          subtitle="Top of funnel customer ingestion and sales pipeline"
        />
        <Button onClick={() => setIsLeadModalOpen(true)}>+ Capture Lead</Button>
      </div>

      {/* Marketing Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            📢 Active Marketing Campaigns
          </h3>
          {campaigns.length === 0 ? (
            <p className="text-sm text-gray-500">No active campaigns configured.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map(c => (
                <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <span className="font-semibold text-sm text-gray-800">{c.name}</span>
                    <div className="text-xs text-gray-400">Created: {new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${
                    c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            📈 Lead Ingestion Channels
          </h3>
          {leadsSummary.length === 0 ? (
            <p className="text-sm text-gray-500">No channel attribution data available.</p>
          ) : (
            <div className="space-y-3">
              {leadsSummary.map(s => (
                <div key={s.source} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="font-medium text-sm text-gray-700">{s.source}</span>
                  <span className="bg-rose-100 text-rose-800 text-xs px-3 py-1 rounded-full font-bold">
                    {s.count} Leads
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <DataTable
          data={leads}
          keyExtractor={(l: any) => String(l.id)}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (l: any) => `${l.first_name} ${l.last_name}`,
            },
            {
              key: 'email',
              header: 'Email',
            },
            {
              key: 'phone',
              header: 'Phone',
              render: (l: any) => l.phone || '--',
            },
            {
              key: 'created_at',
              header: 'Date Captured',
              render: (l: any) => l.created_at ? new Date(l.created_at).toLocaleDateString() : '--',
            },
          ]}
        />
      </Card>

      {/* Lead Capture Modal */}
      <Modal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        title="Capture New Lead"
      >
        <form onSubmit={handleLeadSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">First Name</label>
            <input
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
              required
              value={leadForm.first_name}
              onChange={(e) => setLeadForm({ ...leadForm, first_name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Last Name</label>
            <input
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
              required
              value={leadForm.last_name}
              onChange={(e) => setLeadForm({ ...leadForm, last_name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
              required
              value={leadForm.email}
              onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Phone Number</label>
            <input
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
              value={leadForm.phone}
              onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsLeadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
