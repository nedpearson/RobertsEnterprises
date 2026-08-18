import React, { useState, useEffect } from 'react';
import { PackageSearch, TrendingUp, AlertCircle, ShoppingCart, Loader2, CheckCircle2, ChevronRight, Calculator } from 'lucide-react';
import { Modal, btnPrimary } from '@/components/vowos/ui';

interface SmartPOPredictorProps {
  open: boolean;
  onClose: () => void;
}

export function SmartPOPredictor({ open, onClose }: SmartPOPredictorProps) {
  const [step, setStep] = useState<'scan' | 'results' | 'ordering' | 'success'>('scan');

  useEffect(() => {
    if (open) {
      setStep('scan');
      setTimeout(() => setStep('results'), 2800);
    }
  }, [open]);

  const handleCreatePO = () => {
    setStep('ordering');
    setTimeout(() => setStep('success'), 2000);
  };

  const renderContent = () => {
    switch (step) {
      case 'scan':
        return (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <div className="bg-white p-6 rounded-full shadow-2xl relative border border-stone-100">
                <Calculator className="h-12 w-12 text-blue-600 animate-pulse" />
              </div>
            </div>
            <h3 className="mt-8 font-serif text-2xl font-bold text-stone-900">Calculating Demand Forecast...</h3>
            <p className="mt-2 text-stone-500 text-center max-w-sm">Cross-referencing vendor lead times, upcoming trunk shows, and historical Q4 data.</p>
          </div>
        );

      case 'results':
        return (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex items-start gap-4">
              <div className="bg-rose-600 rounded-full p-2 text-white shadow-sm mt-1">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-rose-900">Stockout Risk Detected</h3>
                <p className="text-sm text-rose-800 mt-2">
                  You are projected to run out of core sample sizes for <strong>3 highly popular gowns</strong> before the start of the Q1 bridal rush. Vendor lead times are currently averaging 16 weeks.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Suggested Purchase Orders</h4>
              
              <div className="border border-stone-200 rounded-xl p-4 bg-white shadow-sm">
                <div className="flex justify-between items-start mb-3 border-b border-stone-100 pb-3">
                  <div>
                    <h5 className="font-bold text-stone-900 flex items-center gap-2">
                      Justin Alexander <ChevronRight className="h-4 w-4 text-stone-400" /> Style 88204
                    </h5>
                    <p className="text-xs text-stone-500">Current Lead Time: 16 Weeks</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-500 uppercase font-bold tracking-wider">Est. Cost</p>
                    <p className="font-serif font-bold text-stone-900">$1,850.00</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                    <p className="text-[10px] font-bold text-stone-400 uppercase">Reasoning</p>
                    <p className="text-xs text-stone-700 mt-1">
                      Size 12 sample is sold. 24 upcoming appointments have favorited this style.
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-blue-400 uppercase">Recommendation</p>
                      <p className="text-xs font-bold text-blue-900 mt-1">Order 1x Size 12 (Ivory)</p>
                    </div>
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl p-4 bg-white shadow-sm">
                <div className="flex justify-between items-start mb-3 border-b border-stone-100 pb-3">
                  <div>
                    <h5 className="font-bold text-stone-900 flex items-center gap-2">
                      Toni Federici <ChevronRight className="h-4 w-4 text-stone-400" /> Avalon Veil
                    </h5>
                    <p className="text-xs text-stone-500">Current Lead Time: 8 Weeks</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-500 uppercase font-bold tracking-wider">Est. Cost</p>
                    <p className="font-serif font-bold text-stone-900">$450.00</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                    <p className="text-[10px] font-bold text-stone-400 uppercase">Reasoning</p>
                    <p className="text-xs text-stone-700 mt-1">
                      High attachment rate (42%) to plain crepe gowns. Only 1 left in stock.
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-blue-400 uppercase">Recommendation</p>
                      <p className="text-xs font-bold text-blue-900 mt-1">Order 3x Standard Length</p>
                    </div>
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </div>

            </div>

            <button 
              onClick={handleCreatePO}
              className={`${btnPrimary} w-full justify-center py-3 mt-4 text-sm`}
            >
              Draft Purchase Orders ($2,300.00)
            </button>
          </div>
        );

      case 'ordering':
        return (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            <h3 className="mt-8 font-serif text-xl font-bold text-stone-900">Drafting Purchase Orders...</h3>
            <p className="mt-2 text-sm text-stone-500">Adding items to Vendor Connect queues.</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in duration-500 text-center">
            <div className="bg-emerald-100 p-4 rounded-full">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
            <h3 className="mt-6 font-serif text-2xl font-bold text-stone-900">Drafts Created</h3>
            <p className="mt-2 text-stone-600 max-w-sm">
              2 Purchase Orders have been drafted. Head over to the Vendor Connect OS to review and submit them.
            </p>
            <button 
              onClick={onClose}
              className={`${btnPrimary} w-full justify-center py-3 mt-8 text-sm`}
            >
              Back to Inventory Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Smart PO Predictor" size="lg">
      <div className="flex flex-col min-h-[500px]">
        {/* Header */}
        <div className="bg-stone-900 text-white p-6 -mt-4 -mx-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur">
              <PackageSearch className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold">Smart PO Predictor</h2>
              <p className="text-xs text-stone-300 mt-0.5">Never miss a sale because a sample wasn't on the floor.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-2 pb-4">
          {renderContent()}
        </div>
      </div>
    </Modal>
  );
}
