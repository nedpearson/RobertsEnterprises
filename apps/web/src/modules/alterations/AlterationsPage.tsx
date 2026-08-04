import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card, CardBody } from '../../design-system/Card';
import { Spinner } from '../../design-system/Spinner';
import { Button } from '../../design-system/Button';
import { PageHeader } from '../../design-system/PageHeader';
import { Modal } from '../../design-system/Modal';
import { useToast } from '../../design-system/ToastContext';

export default function AlterationsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [kanban, setKanban] = useState<Record<string, any[]>>({});
  const [statuses, setStatuses] = useState<string[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  
  const [form, setForm] = useState({
    customer_id: '',
    item_description: '',
    due_date: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [altData, custData] = await Promise.all([
        api.get<any>('/api/alterations'),
        api.get<any>('/api/customers'),
      ]);
      setKanban(altData.kanban || {});
      setStatuses(altData.statuses || ['Awaiting 1st Fitting', 'Pinned', 'Sewing', 'Steaming', 'Ready for Pickup']);
      setCustomers(custData.customers || custData || []);
    } catch (err) {
      console.error('Failed to load alterations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/alterations', form);
      setIsNewTicketOpen(false);
      setForm({ customer_id: '', item_description: '', due_date: '', notes: '' });
      fetchData();
      addToast('Alteration ticket created successfully.', 'success');
    } catch (err: any) {
      addToast('Failed to create ticket: ' + err.message, 'error');
    }
  };

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    try {
      const res = await api.post<any>(`/api/alterations/${ticketId}/status`, { status: newStatus });
      fetchData();
      if (res.notified) {
        addToast('Ticket advanced. Customer was notified via Twilio SMS!', 'success');
      }
    } catch (err: any) {
      addToast('Failed to update status: ' + err.message, 'error');
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
          title="Alterations Kanban Board"
          subtitle="Track dress fitting progression and seamstress assignments"
        />
        <Button onClick={() => setIsNewTicketOpen(true)}>+ New Ticket</Button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin">
        {statuses.map((status) => (
          <div key={status} className="flex-1 min-w-[280px] max-w-[320px]">
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="text-sm font-semibold text-gray-700">{status}</h3>
              <span className="bg-gray-200 text-gray-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {kanban[status]?.length || 0}
              </span>
            </div>

            <div className="space-y-4 min-h-[400px] bg-gray-50/50 p-3 rounded-xl border border-gray-200/50">
              {kanban[status]?.map((ticket) => (
                <Card key={ticket.id} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <CardBody className="p-4 space-y-3">
                    <div>
                      <div className="text-xs text-gray-400">#{ticket.id}</div>
                      <h4 className="text-sm font-bold text-gray-900 mt-0.5">
                        {ticket.customer_name}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {ticket.item_description}
                      </p>
                    </div>

                    {ticket.notes && (
                      <p className="text-[11px] text-gray-400 bg-white border border-gray-50 p-2 rounded italic">
                        "{ticket.notes}"
                      </p>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                      <span className="text-[11px] font-medium text-gray-500">
                        📅 {ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : 'No Due Date'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 pt-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase">Move Lane</label>
                      <select
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                        className="w-full text-xs bg-white border border-gray-200 rounded p-1"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </CardBody>
                </Card>
              ))}

              {(!kanban[status] || kanban[status].length === 0) && (
                <div className="text-center py-8 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  No tickets
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Alteration Modal */}
      <Modal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        title="Create Alteration Ticket"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Bride / Customer</label>
            <select
              required
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
              value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            >
              <option value="">Select Bride...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Dress / Item Description</label>
            <input
              required
              placeholder="Vera Wang Gown - Size 10"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
              value={form.item_description}
              onChange={(e) => setForm({ ...form, item_description: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fitting / Due Date</label>
            <input
              type="date"
              required
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Alteration Notes</label>
            <textarea
              placeholder="Take in waist 2 inches, shorten hem..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none h-20"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsNewTicketOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
