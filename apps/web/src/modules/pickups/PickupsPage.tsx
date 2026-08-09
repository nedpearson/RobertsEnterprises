import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card } from '../../design-system/Card';
import { Spinner } from '../../design-system/Spinner';
import { Button } from '../../design-system/Button';
import { PageHeader } from '../../design-system/PageHeader';
import { DataTable } from '../../design-system/DataTable';
import { useToast } from '../../design-system/ToastContext';

export default function PickupsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pickups, setPickups] = useState<any[]>([]);

  const fetchPickups = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/api/operations');
      setPickups(res.pickups || []);
    } catch (err) {
      console.error('Failed to load pickups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickups();
  }, []);

  const handleMarkReady = async (pickupId: number) => {
    try {
      await api.post<any>(`/api/operations/pickups/${pickupId}/ready`);
      fetchPickups();
      addToast('Pickup QA Verified. Automated Twilio SMS dispatched to customer!', 'success');
    } catch (err: any) {
      addToast('Failed to mark ready: ' + err.message, 'error');
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
      <PageHeader
        title="Pickup Backlog"
        subtitle="Manage completed orders awaiting customer fitting and pickup collection"
      />

      <Card>
        <DataTable
          data={pickups}
          keyExtractor={(p: any) => String(p.id)}
          columns={[
            {
              key: 'status',
              header: 'Status',
              render: (p: any) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    p.qa_verified
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {p.qa_verified ? 'Ready' : 'Pending QA'}
                </span>
              ),
            },
            {
              key: 'customer',
              header: 'Customer',
              render: (p: any) => (
                <div>
                  <div className="font-bold text-gray-900">{p.first_name} {p.last_name}</div>
                  <div className="text-xs text-gray-500">
                    {p.qa_verified ? `Ready since ${new Date(p.ready_since).toLocaleDateString()}` : p.phone || 'No Phone'}
                  </div>
                </div>
              ),
            },
            {
              key: 'item_description',
              header: 'Item Description',
            },
            {
              key: 'action',
              header: 'Action',
              render: (p: any) => (
                !p.qa_verified ? (
                  <Button size="sm" variant="outline" onClick={() => handleMarkReady(p.id)}>
                    ✓ Mark Ready
                  </Button>
                ) : (
                  <span className="text-xs font-bold text-emerald-600">SMS Transmitted</span>
                )
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
