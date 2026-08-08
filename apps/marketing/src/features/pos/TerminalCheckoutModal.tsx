import { useState } from 'react';
import { X, CreditCard, Smartphone, CheckCircle2, DollarSign } from 'lucide-react';
import { Invoice, formatCents } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { resolveEffectiveSetting, DEFAULT_PAYMENT_TAX_SETTINGS, PaymentTaxSettings } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

interface TerminalCheckoutModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export default function TerminalCheckoutModal({ invoice, onClose }: TerminalCheckoutModalProps) {
  const { setInvoices, invoices } = useVowosData();
  const [step, setStep] = useState<'method' | 'processing' | 'success'>('method');
  const [paymentMethod, setPaymentMethod] = useState<'card_on_file' | 'terminal' | null>(null);
  const [taxSettings, setTaxSettings] = useState<PaymentTaxSettings | null>(null);

  useEffect(() => {
    if (invoice) {
      const dataPlane = getActiveDataPlane();
      resolveEffectiveSetting<PaymentTaxSettings>(
        'payment_tax_settings',
        'payment_tax_settings',
        { dataPlane, locationId: invoice.location },
        DEFAULT_PAYMENT_TAX_SETTINGS
      ).then(res => setTaxSettings(res.value)).catch(console.error);
    }
  }, [invoice]);

  if (!invoice) return null;

  const balance = invoice.amountCents - invoice.paidCents;
  const taxRate = taxSettings?.taxRates[invoice.location] ?? 0;
  const taxAmount = Math.round(balance * (taxRate / 100));
  const finalTotal = balance + taxAmount;

  const handleCharge = () => {
    setStep('processing');
    setTimeout(() => {
      // Simulate success
      setInvoices(
        invoices.map((i) =>
          i.id === invoice.id
            ? { ...i, paidCents: i.amountCents, status: 'Paid' }
            : i
        )
      );
      setStep('success');
    }, 2000);
  };

  const handleClose = () => {
    setStep('method');
    setPaymentMethod(null);
    onClose();
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-stone-900 text-stone-100 rounded-2xl shadow-2xl">
        {step === 'method' && (
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-stone-400 text-xs font-semibold uppercase tracking-widest mb-1">POS Terminal checkout</p>
                <h2 className="text-2xl font-serif text-white">{invoice.customer}</h2>
              </div>
              <button onClick={handleClose} className="p-1 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-stone-800 rounded-xl p-4 mb-6 flex justify-between items-center border border-stone-700">
              <div>
                <p className="text-stone-400 text-xs">Total Balance Due (incl. {taxRate}% tax)</p>
                <p className="text-3xl font-bold text-white">{formatCents(finalTotal)}</p>
                {taxAmount > 0 && <p className="text-stone-500 text-xs mt-1">Tax: {formatCents(taxAmount)}</p>}
              </div>
              <div className="text-right">
                <p className="text-stone-400 text-xs">Invoice</p>
                <p className="text-sm font-medium text-stone-300">{invoice.id}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Select Payment Method</p>
              <button 
                onClick={() => setPaymentMethod('card_on_file')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  paymentMethod === 'card_on_file' ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-900/50' : 'bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-600'
                }`}
              >
                <div className={`p-2 rounded-full ${paymentMethod === 'card_on_file' ? 'bg-rose-400' : 'bg-stone-700'}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-sm">Card on File</p>
                  <p className="text-xs opacity-70">Visa ending in 4242</p>
                </div>
              </button>
              
              <button 
                onClick={() => setPaymentMethod('terminal')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  paymentMethod === 'terminal' ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-900/50' : 'bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-600'
                }`}
              >
                <div className={`p-2 rounded-full ${paymentMethod === 'terminal' ? 'bg-rose-400' : 'bg-stone-700'}`}>
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-sm">Physical Terminal</p>
                  <p className="text-xs opacity-70">Tap to pay with Apple Pay or Card</p>
                </div>
              </button>
            </div>

            <div className="mt-8">
              <Button 
                onClick={handleCharge}
                disabled={!paymentMethod}
                className="w-full h-12 bg-white text-stone-900 hover:bg-stone-200 text-sm font-bold shadow-md rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Charge {formatCents(finalTotal)}
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-stone-700 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-rose-500 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-rose-500 animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Processing Payment...</h3>
              <p className="text-sm text-stone-400">Please wait while we connect securely.</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Payment Successful</h3>
              <p className="text-sm text-stone-400 mb-6">The invoice balance has been cleared.</p>
              <Button 
                onClick={handleClose}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-12 font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
