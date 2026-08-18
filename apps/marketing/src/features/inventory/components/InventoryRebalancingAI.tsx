import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Sparkles, AlertTriangle, TrendingUp, Package, Loader2, MapPin, Truck, CheckCircle2 } from 'lucide-react';
import { Modal, btnPrimary } from '@/components/vowos/ui';

interface InventoryRebalancingAIProps {
  open: boolean;
  onClose: () => void;
}

export function InventoryRebalancingAI({ open, onClose }: InventoryRebalancingAIProps) {
  const [step, setStep] = useState<'scan' | 'results' | 'transferring' | 'success'>('scan');

  useEffect(() => {
    if (open) {
      setStep('scan');
      setTimeout(() => setStep('results'), 2500);
    }
  }, [open]);

  const handleExecuteTransfer = () => {
    setStep('transferring');
    setTimeout(() => setStep('success'), 2000);
  };

  const renderContent = () => {
    switch (step) {
      case 'scan':
        return (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <div className="bg-white p-6 rounded-full shadow-2xl relative border border-stone-100">
                <ArrowRightLeft className="h-12 w-12 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <h3 className="mt-8 font-serif text-2xl font-bold text-stone-900">Scanning Network Inventory...</h3>
            <p className="mt-2 text-stone-500 text-center max-w-sm">Analyzing cross-location sell-through rates, appointment demand, and aging stock to optimize floor space.</p>
          </div>
        );

      case 'results':
        return (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex items-start gap-4">
              <div className="bg-indigo-600 rounded-full p-2 text-white shadow-sm mt-1">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-indigo-900">AI Rebalancing Opportunity Found</h3>
                <p className="text-sm text-indigo-800 mt-2">
                  Moving <strong>3 aging samples</strong> from Covington to Baton Rouge is predicted to increase overall sell-through by 18% over the next 30 days based on upcoming appointment preferences.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Recommended Transfers</h4>
              
              {/* Item 1 */}
              <div className="border border-stone-200 rounded-xl p-4 flex items-center justify-between bg-white shadow-sm hover:border-indigo-200 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="bg-stone-100 p-3 rounded-lg">
                    <Package className="h-6 w-6 text-stone-600" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">Monique Lhuillier - "Majesty"</p>
                    <p className="text-xs text-stone-500">Size 10 • Ivory/Nude</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-bold">
                        <AlertTriangle className="h-3 w-3" /> 120 Days on Floor
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-stone-50 px-4 py-2 rounded-lg border border-stone-100">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-stone-400 uppercase">From</p>
                    <p className="text-xs font-bold text-stone-700">Covington</p>
                  </div>
                  <ArrowRightLeft className="h-4 w-4 text-indigo-500" />
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-stone-400 uppercase">To</p>
                    <p className="text-xs font-bold text-emerald-600">Baton Rouge</p>
                  </div>
                </div>
              </div>

              {/* Item 2 */}
              <div className="border border-stone-200 rounded-xl p-4 flex items-center justify-between bg-white shadow-sm hover:border-indigo-200 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="bg-stone-100 p-3 rounded-lg">
                    <Package className="h-6 w-6 text-stone-600" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">Martina Liana - "Style 1305"</p>
                    <p className="text-xs text-stone-500">Size 12 • Ivory</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                        <TrendingUp className="h-3 w-3" /> High Demand Match
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-stone-50 px-4 py-2 rounded-lg border border-stone-100">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-stone-400 uppercase">From</p>
                    <p className="text-xs font-bold text-stone-700">Covington</p>
                  </div>
                  <ArrowRightLeft className="h-4 w-4 text-indigo-500" />
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-stone-400 uppercase">To</p>
                    <p className="text-xs font-bold text-emerald-600">Baton Rouge</p>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleExecuteTransfer}
              className={`${btnPrimary} w-full justify-center py-3 mt-4 text-sm`}
            >
              Generate Transfer Manifest <Truck className="h-4 w-4 ml-2" />
            </button>
          </div>
        );

      case 'transferring':
        return (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
            <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
            <h3 className="mt-8 font-serif text-xl font-bold text-stone-900">Creating Transfer Request...</h3>
            <p className="mt-2 text-sm text-stone-500">Notifying Covington manager and generating shipping labels.</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in duration-500 text-center">
            <div className="bg-emerald-100 p-4 rounded-full">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
            <h3 className="mt-6 font-serif text-2xl font-bold text-stone-900">Transfer Initiated</h3>
            <p className="mt-2 text-stone-600 max-w-sm">
              Transfer Manifest <strong>TRN-8924</strong> has been created. The Covington team has been notified to pack these items for the courier tomorrow.
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
    <Modal open={open} onClose={onClose} title="AI Rebalancing Engine" size="lg">
      <div className="flex flex-col min-h-[500px]">
        {/* Header */}
        <div className="bg-stone-900 text-white p-6 -mt-4 -mx-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold">Network Inventory Optimizer</h2>
              <p className="text-xs text-stone-300 mt-0.5">Maximize ROI by placing the right dresses in the right stores.</p>
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
