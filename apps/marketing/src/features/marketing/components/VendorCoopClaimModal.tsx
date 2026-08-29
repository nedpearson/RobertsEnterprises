import { Modal } from '@/components/vowos/ui';
import { Download, FileText, CheckCircle2, ShieldCheck, Printer } from 'lucide-react';
import { formatCents, formatDate } from '@/data/vowosData';

interface VendorCoopClaimModalProps {
  claimId: string;
  vendor: string;
  amountCents: number;
  onClose: () => void;
}

export default function VendorCoopClaimModal({ claimId, vendor, amountCents, onClose }: VendorCoopClaimModalProps) {
  return (
    <Modal open={true} onClose={onClose} title="Generated Co-Op Claim PDF">
      <div className="bg-stone-100 p-4 -mt-2 -mx-2 rounded-t-xl flex items-center justify-between border-b border-stone-200">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-primary" />
          <span className="font-bold text-sm text-stone-900">{vendor}_CoOp_Claim_{claimId}.pdf</span>
        </div>
        <div className="flex gap-2">
           <button className="p-2 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-900 transition-colors">
             <Printer className="h-4 w-4" />
           </button>
           <button className="px-3 py-1.5 rounded-lg bg-brand-primary-hover font-bold text-xs text-white shadow-xs hover:bg-rose-700 transition-colors flex items-center gap-1.5">
             <Download className="h-3.5 w-3.5" /> Download PDF
           </button>
        </div>
      </div>

      <div className="bg-white border border-stone-200 shadow-sm mt-4 p-8 min-h-[600px]">
        {/* PDF Header */}
        <div className="border-b-2 border-stone-900 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black text-stone-900 uppercase tracking-widest">Co-Op Advertising Claim</h1>
            <p className="text-sm font-bold text-stone-500 mt-1">Submitted by: The Boutique (I Do Bridal Couture)</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-stone-900">Claim ID: <span className="font-mono text-stone-500">{claimId}</span></p>
            <p className="text-sm font-bold text-stone-900 mt-0.5">Date: <span className="font-mono text-stone-500">{formatDate(new Date().toISOString())}</span></p>
          </div>
        </div>

        {/* Claim Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
           <div>
             <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-2 border-b border-stone-200 pb-1">Vendor Information</h3>
             <p className="font-bold text-stone-900">{vendor} Bridal</p>
             <p className="text-xs text-stone-600 mt-1">Attn: Co-Op Marketing Department</p>
           </div>
           <div>
             <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-2 border-b border-stone-200 pb-1">Claim Summary</h3>
             <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-bold text-stone-700">Total Spend on {vendor} Ads:</span>
                <span className="text-lg font-black text-stone-900">{formatCents(amountCents)}</span>
             </div>
             <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-bold text-emerald-700">Requested Co-Op Match (50%):</span>
                <span className="text-xl font-black text-status-success">{formatCents(amountCents / 2)}</span>
             </div>
           </div>
        </div>

        {/* Proof of Execution */}
        <div className="mb-8">
           <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-4 border-b border-stone-200 pb-1">Proof of Execution &amp; Spend</h3>
           
           <div className="border border-stone-200 rounded-lg p-4 mb-4 bg-stone-50">
             <div className="flex justify-between items-center mb-3">
               <span className="font-bold text-stone-900 text-sm flex items-center gap-2">
                 <ShieldCheck className="h-4 w-4 text-status-success" /> Meta Ads Invoice #INV-84920
               </span>
               <span className="text-xs font-mono text-stone-500">Paid Jul 15, 2026</span>
             </div>
             <p className="text-xs text-stone-600 mb-4">
               The following ad sets specifically targeted the {vendor} brand name and imagery, meeting all brand compliance guidelines.
             </p>
             
             {/* Simulated Screenshots */}
             <div className="grid grid-cols-3 gap-4">
               <div className="h-32 bg-stone-200 rounded flex flex-col items-center justify-center border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Ad Creative</span>
                  <span className="text-[9px] text-stone-400 mt-1">{vendor} Fall Collection Reel</span>
               </div>
               <div className="h-32 bg-stone-200 rounded flex flex-col items-center justify-center border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Ad Creative</span>
                  <span className="text-[9px] text-stone-400 mt-1">{vendor} Trunk Show Carousel</span>
               </div>
               <div className="h-32 bg-stone-200 rounded flex flex-col items-center justify-center border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Spend Report</span>
                  <span className="text-[9px] text-stone-400 mt-1">Facebook Business Manager</span>
               </div>
             </div>
           </div>
        </div>

        {/* Certification */}
        <div className="pt-6 border-t-2 border-stone-900">
           <p className="text-xs font-medium text-stone-600 italic">
             "I certify that the above advertising was placed exclusively for {vendor} products and complies with the {vendor} Co-Op Advertising Guidelines. All attached invoices represent actual paid media spend."
           </p>
           <div className="mt-6 flex items-center gap-4">
              <div className="h-10 w-48 border-b border-stone-900 flex flex-col justify-end pb-1">
                 <span className="font-script text-2xl text-stone-800">Ned Pearson</span>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">Ned Pearson</p>
                <p className="text-[10px] text-stone-500">Owner, The Boutique</p>
              </div>
           </div>
        </div>

      </div>
    </Modal>
  );
}
