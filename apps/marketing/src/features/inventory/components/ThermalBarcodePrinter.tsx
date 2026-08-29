import React, { useState } from 'react';
import { Printer, CheckCircle2, RefreshCw, Barcode, Sliders, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/vowos/ui';

interface ThermalBarcodePrinterProps {
  isOpen: boolean;
  onClose: () => void;
  product?: {
    name: string;
    brand: string;
    styleNumber: string;
    size: string;
    color: string;
    priceCents: number;
    barcode: string;
  };
}

export default function ThermalBarcodePrinter({ isOpen, onClose, product }: ThermalBarcodePrinterProps) {
  const [printerType, setPrinterType] = useState<'zebra' | 'dymo' | 'brother' | 'web_serial'>('web_serial');
  const [copies, setCopies] = useState(1);
  const [labelSize, setLabelSize] = useState<'2x1' | '2.25x1.25' | 'swing_tag'>('2x1');
  const [printing, setPrinting] = useState(false);
  const [success, setSuccess] = useState(false);

  const defaultItem = product || {
    name: 'Ines Di Santo Couture Silk Gown',
    brand: 'I Do Bridal Couture',
    styleNumber: 'IDS-2026-FALL',
    size: '10',
    color: 'Ivory / Lace',
    priceCents: 450000, // $4,500.00
    barcode: '881029384912',
  };

  const handlePrint = async () => {
    setPrinting(true);
    setSuccess(false);

    // Simulate Web Serial / ESC-POS / ZPL thermal printing
    setTimeout(() => {
      setPrinting(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title="Direct Thermal Barcode Swing-Tag Printer">
      <div className="space-y-6">
        
        {/* Label Preview Card */}
        <div className="rounded-2xl border-2 border-stone-900 bg-white p-5 shadow-md flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden">
          <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 border border-stone-200 px-2 py-0.5 rounded">
            {defaultItem.brand} · {labelSize.toUpperCase()} Thermal Tag
          </span>

          <h3 className="font-bold text-sm text-stone-900 leading-tight">{defaultItem.name}</h3>
          
          <div className="flex items-center gap-3 text-xs font-semibold text-stone-700">
            <span>Style: {defaultItem.styleNumber}</span>
            <span>·</span>
            <span>Size: {defaultItem.size}</span>
            <span>·</span>
            <span>{defaultItem.color}</span>
          </div>

          <div className="py-2 flex flex-col items-center">
            <Barcode className="h-12 w-48 text-stone-900" />
            <span className="font-mono text-xs font-bold text-stone-800 tracking-widest">{defaultItem.barcode}</span>
          </div>

          <p className="font-serif text-lg font-bold text-stone-900">${(defaultItem.priceCents / 100).toLocaleString()}.00</p>
        </div>

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Thermal Printer Type</label>
            <select
              value={printerType}
              onChange={(e: any) => setPrinterType(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-900"
            >
              <option value="web_serial">Web Serial (Auto-Detect USB)</option>
              <option value="zebra">Zebra ZPL Thermal Printer</option>
              <option value="dymo">Dymo LabelWriter 450/550</option>
              <option value="brother">Brother QL Series</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Tag Size</label>
            <select
              value={labelSize}
              onChange={(e: any) => setLabelSize(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-900"
            >
              <option value="2x1">2" x 1" Standard Barcode Tag</option>
              <option value="2.25x1.25">2.25" x 1.25" Bridal Tag</option>
              <option value="swing_tag">Bridal Boutique Swing Tag</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Copies</label>
            <input
              type="number"
              min="1"
              max="100"
              value={copies}
              onChange={(e) => setCopies(parseInt(e.target.value || '1', 10))}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-900"
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handlePrint}
          disabled={printing}
          className="w-full rounded-xl bg-stone-900 px-4 py-3 text-xs font-bold text-white shadow-lg hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
        >
          {printing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> Sending Thermal ESC-POS Command...
            </>
          ) : (
            <>
              <Printer className="h-4 w-4" /> Print {copies} Thermal Barcode Tag{copies > 1 ? 's' : ''}
            </>
          )}
        </button>

        {success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Thermal barcode swing-tags sent to USB printer successfully!</span>
          </div>
        )}

      </div>
    </Modal>
  );
}
