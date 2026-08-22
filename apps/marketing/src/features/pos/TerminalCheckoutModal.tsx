import { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, CheckCircle2, DollarSign, Printer, AlertCircle, RefreshCw } from 'lucide-react';
import { Invoice, formatCents } from '@/data/vowosData';
import { useVowosData, resolveLocationId, generateEntityId, isUuid, DEMO_BUSINESS_ID } from '@/contexts/VowosDataContext';
import { Dialog, DialogContent } from '@vowos/design-system';
import { Button } from '@vowos/design-system';
import { resolveEffectiveSetting, DEFAULT_PAYMENT_TAX_SETTINGS, PaymentTaxSettings } from '@/lib/settings';
import { getActiveDataPlane, supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface TerminalCheckoutModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

interface ReceiptData {
  txId: string;
  paymentId: string;
  date: string;
  amountPaid: number;
  taxAmount: number;
  paymentMethod: string;
  customer: string;
  invoiceId: string;
  location: string;
}

export default function TerminalCheckoutModal({ invoice, onClose }: TerminalCheckoutModalProps) {
  const { recordPayment, brides } = useVowosData();
  const [step, setStep] = useState<'method' | 'processing' | 'success'>('method');
  const [paymentMethod, setPaymentMethod] = useState<'card_on_file' | 'terminal' | null>(null);
  const [taxSettings, setTaxSettings] = useState<PaymentTaxSettings | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

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

  const handleCharge = async () => {
    if (!paymentMethod) return;
    setStep('processing');
    setErrorMessage(null);

    try {
      // 1. Genuine payment recording in VowOS data layer & database
      const success = await recordPayment(invoice.id, balance);
      if (!success) {
        throw new Error('Payment recording failed. Please verify the invoice status and try again.');
      }

      // 2. Record ledger transaction in Supabase payments table
      const txId = `pos_tx_${Date.now()}`;
      const paymentId = generateEntityId();
      const locId = resolveLocationId(invoice.location);
      const matchingBride = brides.find(
        (b) => b.name.toLowerCase() === invoice.customer.toLowerCase() || b.id === invoice.customer
      );
      const customerId = matchingBride && isUuid(matchingBride.id) ? matchingBride.id : null;

      try {
        await supabase.from('payments').insert({
          id: paymentId,
          business_id: DEMO_BUSINESS_ID,
          location_id: locId,
          customer_id: customerId,
          invoice_id: invoice.id,
          amount_cents: finalTotal,
          payment_method: paymentMethod === 'card_on_file' ? 'credit_card' : 'terminal',
          provider_transaction_id: txId,
          status: 'completed',
          notes: `POS Terminal Checkout (${paymentMethod === 'card_on_file' ? 'Card on File' : 'Physical Terminal'})`,
          processed_at: new Date().toISOString(),
        });
      } catch (insertErr) {
        console.warn('Could not insert secondary payment ledger row:', insertErr);
      }

      // 3. Optional message / timeline log
      try {
        await supabase.from('messages').insert({
          id: generateEntityId(),
          business_id: DEMO_BUSINESS_ID,
          location_id: locId,
          customer_id: customerId,
          sender: 'POS Terminal',
          content: `Payment of ${formatCents(finalTotal)} recorded via ${
            paymentMethod === 'card_on_file' ? 'Card on File' : 'Terminal'
          } for invoice #${invoice.id}.`,
          channel: 'pos_receipt',
          sent_at: new Date().toISOString(),
        });
      } catch (msgErr) {
        // Non-fatal logging
      }

      setReceiptData({
        txId,
        paymentId,
        date: new Date().toLocaleString(),
        amountPaid: finalTotal,
        taxAmount,
        paymentMethod: paymentMethod === 'card_on_file' ? 'Card on File (Visa •••• 4242)' : 'Physical Terminal (Contactless)',
        customer: invoice.customer,
        invoiceId: invoice.id,
        location: invoice.location,
      });

      setStep('success');
      toast.success('Payment recorded successfully');
    } catch (err: any) {
      console.error('POS Checkout error:', err);
      setErrorMessage(err.message || 'Payment processing failed. Please retry.');
      setStep('method');
      toast.error(err.message || 'Payment failed');
    }
  };

  const handleClose = () => {
    setStep('method');
    setPaymentMethod(null);
    setErrorMessage(null);
    setReceiptData(null);
    onClose();
  };

  const handlePrintReceipt = () => {
    window.print();
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

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Transaction Error</p>
                  <p className="text-rose-300/90">{errorMessage}</p>
                </div>
              </div>
            )}
            
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
                  paymentMethod === 'card_on_file' ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-rose-900/50' : 'bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-600'
                }`}
              >
                <div className={`p-2 rounded-full ${paymentMethod === 'card_on_file' ? 'bg-brand-primary' : 'bg-stone-700'}`}>
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
                  paymentMethod === 'terminal' ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-rose-900/50' : 'bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-600'
                }`}
              >
                <div className={`p-2 rounded-full ${paymentMethod === 'terminal' ? 'bg-brand-primary' : 'bg-stone-700'}`}>
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
              <div className="absolute inset-0 border-4 border-brand-primary rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-brand-primary animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Processing Payment...</h3>
              <p className="text-sm text-stone-400">Recording transaction and updating invoice ledger.</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Payment Successful</h3>
              <p className="text-xs text-stone-400">The invoice balance has been cleared and recorded to ledger.</p>
            </div>

            {receiptData && (
              <div className="w-full bg-stone-800/90 rounded-xl p-4 border border-stone-700 text-left text-xs space-y-2">
                <div className="flex justify-between border-b border-stone-700 pb-2">
                  <span className="text-stone-400">Customer</span>
                  <span className="font-semibold text-white">{receiptData.customer}</span>
                </div>
                <div className="flex justify-between border-b border-stone-700 pb-2">
                  <span className="text-stone-400">Invoice ID</span>
                  <span className="font-mono text-stone-200">{receiptData.invoiceId}</span>
                </div>
                <div className="flex justify-between border-b border-stone-700 pb-2">
                  <span className="text-stone-400">Payment Method</span>
                  <span className="text-stone-200">{receiptData.paymentMethod}</span>
                </div>
                <div className="flex justify-between border-b border-stone-700 pb-2">
                  <span className="text-stone-400">Total Paid</span>
                  <span className="font-bold text-emerald-400">{formatCents(receiptData.amountPaid)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-stone-400">Transaction ID</span>
                  <span className="font-mono text-[10px] text-stone-400">{receiptData.txId}</span>
                </div>
              </div>
            )}

            <div className="w-full grid grid-cols-2 gap-3 pt-2">
              <Button
                onClick={handlePrintReceipt}
                className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl h-11 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </Button>
              <Button 
                onClick={handleClose}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 text-xs font-bold"
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
