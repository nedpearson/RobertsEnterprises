import { useState } from 'react';
import { Card, CardBody } from '../../design-system/Card';
import { Button } from '../../design-system/Button';
import { Modal } from '../../design-system/Modal';
import { useToast } from '../../design-system/ToastContext';

export default function Customer360View({ customer, onBack }: { customer: any, onBack: () => void }) {
  const { addToast } = useToast();
  
  // Synthetic Data for Demo
  const [lifecycleState, setLifecycleState] = useState('APPOINTMENT_CONFIRMED');
  const [timeline, setTimeline] = useState([
    { date: 'Today', title: 'Appointment Confirmed', description: 'Assigned to Ramsey.' },
    { date: 'Yesterday', title: 'Appointment Requested', description: 'Web booking.' },
    { date: '2 days ago', title: 'Inquiry', description: 'Website lead received.' }
  ]);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [agreed, setAgreed] = useState(false);

  const startTryOn = () => setTryOnOpen(true);
  
  const finishTryOn = () => {
    setTryOnOpen(false);
    setLifecycleState('STYLE_SELECTED');
    setTimeline([{ date: 'Just now', title: 'Dress Selected', description: 'Style 4182, Ivory, Size 10' }, ...timeline]);
    addToast('Dress selected and inventory checked.', 'success');
  };

  const createPO = () => {
    setLifecycleState('PO_SUBMITTED');
    setTimeline([{ date: 'Just now', title: 'Special Order PO Created', description: 'Sent to Vendor API.' }, ...timeline]);
    addToast('Purchase Order submitted.', 'success');
  };

  const processPayment = () => {
    if (!agreed) {
      addToast('Signature acknowledgment required!', 'error');
      return;
    }
    setLifecycleState('DEPOSIT_PAID');
    setTimeline([{ date: 'Just now', title: 'Deposit Paid', description: `Amount: $1000. Fee: $${paymentMethod === 'credit' ? '30' : '0'}` }, ...timeline]);
    setPaymentOpen(false);
    addToast('Payment successful!', 'success');
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={onBack}>← Back to Customer List</Button>
      
      {/* Next Best Action Banner */}
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-md flex justify-between items-center">
        <div>
          <h4 className="font-bold">Next Step: {lifecycleState}</h4>
          <p className="text-sm opacity-80">
            {lifecycleState === 'APPOINTMENT_CONFIRMED' && 'Customer is ready for Try-On Session.'}
            {lifecycleState === 'STYLE_SELECTED' && 'Dress selected. Create Vendor PO.'}
            {lifecycleState === 'PO_SUBMITTED' && 'Order placed. Awaiting deposit.'}
            {lifecycleState === 'DEPOSIT_PAID' && 'Deposit received. Awaiting dress arrival.'}
          </p>
        </div>
        <div className="flex gap-2">
          {lifecycleState === 'APPOINTMENT_CONFIRMED' && <Button onClick={startTryOn}>Start Try-On Mode</Button>}
          {lifecycleState === 'STYLE_SELECTED' && <Button onClick={createPO}>Create PO</Button>}
          {lifecycleState === 'PO_SUBMITTED' && <Button onClick={() => setPaymentOpen(true)}>Take Deposit</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="elevated" className="col-span-1">
          <CardBody className="p-6">
            <h2 className="text-2xl font-bold text-gray-900">{customer.first_name} {customer.last_name}</h2>
            <p className="text-sm text-gray-500 mt-1">{customer.email}</p>
            <p className="text-sm text-gray-500 mt-1">{customer.phone || 'No phone provided'}</p>
            <hr className="my-6 border-gray-100" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Style Profile</h3>
            <div className="text-sm text-gray-600 mt-2 space-y-1">
              <p><b>Likes:</b> A-line, Satin, Square Neckline</p>
              <p><b>Avoids:</b> Heavy Beading</p>
              <p><b>Budget:</b> $2,500 - $4,000</p>
            </div>
            <hr className="my-6 border-gray-100" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Measurements</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-500 block">Bust</span><span className="text-sm font-semibold text-gray-900">34"</span></div>
              <div className="p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-500 block">Waist</span><span className="text-sm font-semibold text-gray-900">26"</span></div>
              <div className="p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-500 block">Hips</span><span className="text-sm font-semibold text-gray-900">38"</span></div>
              <div className="p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-500 block">Height</span><span className="text-sm font-semibold text-gray-900">5'6"</span></div>
            </div>
          </CardBody>
        </Card>

        <Card variant="elevated" className="col-span-2">
          <CardBody className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Customer Timeline</h3>
            <div className="space-y-6">
              {timeline.map((event, i) => (
                <div key={i} className={`relative pl-6 border-l-2 ${i === 0 ? 'border-rose-500' : 'border-gray-200'}`}>
                  <div className={`absolute -left-[6px] top-1.5 w-[10px] h-[10px] rounded-full ${i === 0 ? 'bg-rose-500' : 'bg-gray-300'}`} />
                  <span className="text-xs text-gray-400 block">{event.date}</span>
                  <p className="text-sm font-bold text-gray-800 mt-1">{event.title}</p>
                  <p className="text-sm font-medium text-gray-600 mt-1">{event.description}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={tryOnOpen} onClose={() => setTryOnOpen(false)} title="Tablet Try-On Mode">
        <div className="space-y-4 text-center">
          <div className="p-10 bg-gray-100 rounded-lg">
            <h3 className="text-xl font-bold">AI Recommended: Style 4182</h3>
            <p className="text-gray-500">92% Match: Satin, Square Neckline</p>
            <div className="flex gap-4 justify-center mt-6">
              <Button onClick={finishTryOn} className="bg-green-600 text-white px-8 py-4 text-xl">LOVE IT</Button>
              <Button onClick={() => addToast('Noted as dislike', 'info')} className="bg-red-500 text-white px-8 py-4 text-xl">NO</Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} title="Process Deposit">
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label>Payment Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="border p-2 rounded">
              <option value="credit">Credit Card</option>
              <option value="debit">Debit Card</option>
              <option value="ach">ACH Bank Transfer</option>
            </select>
          </div>
          <div className="bg-gray-50 p-4 rounded text-sm">
            <p className="flex justify-between"><span>Base Amount:</span> <span>$1,000.00</span></p>
            {paymentMethod === 'credit' && (
              <p className="flex justify-between text-rose-600"><span>Credit Surcharge (3%):</span> <span>$30.00</span></p>
            )}
            <hr className="my-2" />
            <p className="flex justify-between font-bold text-lg"><span>Total:</span> <span>${paymentMethod === 'credit' ? '1,030.00' : '1,000.00'}</span></p>
          </div>
          <div className="flex items-start gap-2">
            <input type="checkbox" id="sig" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1" />
            <label htmlFor="sig" className="text-xs text-gray-600">
              I acknowledge the payment terms above, including any applicable credit card surcharges.
            </label>
          </div>
          <Button onClick={processPayment} className="w-full">Authorize Charge</Button>
        </div>
      </Modal>
    </div>
  );
}
