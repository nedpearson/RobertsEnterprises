import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { CalendarModule } from '../../CalendarModule';
import { Spinner } from '../../design-system/Spinner';
import { Modal } from '../../design-system/Modal';
import { Button } from '../../design-system/Button';
import { useToast } from '../../design-system/ToastContext';

export default function CalendarPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);

  const [form, setForm] = useState({
    customer_id: '',
    time_slot: '10:00 AM',
    type: 'Bridal Fitting',
    consultant_name: 'Jessica M.',
    room_name: 'Suite A'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [opsData, customersData] = await Promise.all([
        api.get<any>('/api/operations').catch(() => ({ appointments: [] })),
        api.get<any>('/api/customers').catch(() => ({ customers: [] })),
      ]);
      setAppointments(opsData.appointments || []);
      setCustomers(customersData.customers || customersData || []);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBookAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/appointments', form);
      setIsApptModalOpen(false);
      setForm({ customer_id: '', time_slot: '10:00 AM', type: 'Bridal Fitting', consultant_name: 'Jessica M.', room_name: 'Suite A' });
      fetchData();
      addToast('Appointment booked successfully.', 'success');
    } catch (err: any) {
      addToast('Failed to book appointment: ' + err.message, 'error');
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
      <CalendarModule
        appointments={appointments}
        onNewAppt={() => setIsApptModalOpen(true)}
        onInspectAppt={(appt) => setSelectedAppt(appt)}
      />

      {/* Book Appointment Modal */}
      <Modal
        isOpen={isApptModalOpen}
        onClose={() => setIsApptModalOpen(false)}
        title="Book Appointment & Lock Resources"
      >
        <form onSubmit={handleBookAppt} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Select Bride</label>
            <select
              required
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Time Slot</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
                value={form.time_slot}
                onChange={(e) => setForm({ ...form, time_slot: e.target.value })}
              >
                {['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Appt Type</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {['Bridal Fitting', 'First View', 'Alterations', 'Accessory styling'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Stylist / Consultant</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
                value={form.consultant_name}
                onChange={(e) => setForm({ ...form, consultant_name: e.target.value })}
              >
                {['Jessica M.', 'Sarah K.', 'Emily R.'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Physical Suite</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
                value={form.room_name}
                onChange={(e) => setForm({ ...form, room_name: e.target.value })}
              >
                {['Suite A', 'Suite B', 'Podium 1'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsApptModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Lock Resource Booking
            </Button>
          </div>
        </form>
      </Modal>

      {/* Inspect Appointment Modal */}
      <Modal
        isOpen={!!selectedAppt}
        onClose={() => setSelectedAppt(null)}
        title="Appointment details"
      >
        {selectedAppt && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="text-xs text-gray-500 font-semibold uppercase">Customer</div>
              <div className="text-base font-bold text-gray-900">
                {selectedAppt.first_name} {selectedAppt.last_name}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-xs text-gray-500 block">Time Slot</span>
                  <span className="text-sm font-semibold">{selectedAppt.time_slot}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Type</span>
                  <span className="text-sm font-semibold">{selectedAppt.type}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Consultant</span>
                  <span className="text-sm font-semibold">{selectedAppt.consultant_name}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Suite / Room</span>
                  <span className="text-sm font-semibold">{selectedAppt.room_name}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setSelectedAppt(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
