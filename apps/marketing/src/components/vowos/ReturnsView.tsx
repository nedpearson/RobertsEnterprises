import { useState, useMemo, useEffect } from 'react';
import { 
  PackageX, RotateCcw, Search, Filter, Plus, ChevronRight, Eye, Printer, 
  FileText, Truck, CheckCircle2, AlertCircle, X, ShieldCheck, Tag, Hash, Building
} from 'lucide-react';
import { btnPrimary, btnSecondary, Modal, StatusBadge } from '@/components/vowos/ui';
import { useVowosData } from '@/contexts/VowosDataContext';
import { formatCents, locationById } from '@/data/vowosData';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface ReturnOrder {
  id: string;
  vendor: string;
  items: number;
  value: number; // in cents
  status: 'Draft' | 'Pending Approval' | 'Shipped' | 'Refunded';
  date: string;
  reason: 'Defective Merchandise' | 'Stock Balancing' | 'Sample Return' | 'Customer Cancellation' | 'Size Discrepancy';
  gownId?: string;
  gownName?: string;
  invoiceId?: string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
}

const INITIAL_RETURNS: ReturnOrder[] = [
  {
    id: 'RTV-8042',
    vendor: 'Maggie Sottero',
    items: 3,
    value: 245000,
    status: 'Shipped',
    date: '2026-08-14',
    reason: 'Defective Merchandise',
    gownName: 'Derrick (Maggie Sottero)',
    invoiceId: 'INV-2024-001',
    trackingNumber: '1Z9999999999999999',
    carrier: 'UPS Ground',
    notes: 'Beading defect on bodice seam. Approved by vendor rep.',
  },
  {
    id: 'RTV-8043',
    vendor: 'Justin Alexander',
    items: 1,
    value: 85000,
    status: 'Draft',
    date: '2026-08-18',
    reason: 'Stock Balancing',
    gownName: 'Bobbie (Justin Alexander)',
    invoiceId: 'INV-2024-002',
    carrier: 'FedEx Freight',
    notes: 'Returning surplus sample size 10 to designer warehouse.',
  },
  {
    id: 'RTV-8044',
    vendor: 'Essense of Australia',
    items: 5,
    value: 412000,
    status: 'Pending Approval',
    date: '2026-08-19',
    reason: 'Sample Return',
    gownName: 'D3384 (Essense of Australia)',
    invoiceId: 'INV-2024-003',
    carrier: 'UPS Ground',
    notes: 'End of season trunk show sample return package.',
  },
];

export default function ReturnsView() {
  const { allGowns, allInvoices, activeLocation } = useVowosData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  
  const storageKey = useMemo(() => `vowos_rtv_orders_${activeLocation}`, [activeLocation]);

  const [returns, setReturns] = useState<ReturnOrder[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_RETURNS;
  });

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRtv, setSelectedRtv] = useState<ReturnOrder | null>(null);
  const [inspectingGown, setInspectingGown] = useState<ReturnOrder | null>(null);
  const [printingLabelRtv, setPrintingLabelRtv] = useState<ReturnOrder | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);

  // Form state for new RTV
  const [newVendor, setNewVendor] = useState('Maggie Sottero');
  const [newGownName, setNewGownName] = useState('');
  const [newItemsCount, setNewItemsCount] = useState(1);
  const [newValueCents, setNewValueCents] = useState(150000);
  const [newReason, setNewReason] = useState<ReturnOrder['reason']>('Defective Merchandise');
  const [newNotes, setNewNotes] = useState('');

  // Load from Supabase on mount
  useEffect(() => {
    let mounted = true;
    async function loadReturns() {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', `rtv_orders_${activeLocation}`)
          .maybeSingle();

        if (mounted && data?.value && Array.isArray(data.value)) {
          setReturns(data.value);
        }
      } catch {
        // use local
      }
    }
    loadReturns();
    return () => { mounted = false; };
  }, [activeLocation]);

  const persistReturns = async (updated: ReturnOrder[]) => {
    setReturns(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      await supabase.from('app_settings').upsert({
        key: `rtv_orders_${activeLocation}`,
        value: updated,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // non-blocking
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100);
  };

  const getStatusColor = (status: ReturnOrder['status']) => {
    switch (status) {
      case 'Draft': return 'bg-stone-100 text-stone-600';
      case 'Pending Approval': return 'bg-amber-100 text-amber-700';
      case 'Shipped': return 'bg-blue-100 text-blue-700';
      case 'Refunded': return 'bg-emerald-100 text-emerald-700';
    }
  };

  // Filtered live returns
  const filteredReturns = useMemo(() => {
    return returns.filter((rtv) => {
      const matchesSearch = 
        !searchTerm.trim() ||
        rtv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rtv.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rtv.gownName && rtv.gownName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (rtv.reason && rtv.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (rtv.notes && rtv.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'All' || rtv.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [returns, searchTerm, statusFilter]);

  const handleCreateRtv = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `RTV-${Math.floor(8050 + Math.random() * 1000)}`;
    const newOrder: ReturnOrder = {
      id: newId,
      vendor: newVendor,
      items: Number(newItemsCount) || 1,
      value: Number(newValueCents) || 100000,
      status: 'Draft',
      date: new Date().toISOString().slice(0, 10),
      reason: newReason,
      gownName: newGownName || `${newVendor} Item`,
      notes: newNotes,
      carrier: 'UPS Ground',
    };

    const updated = [newOrder, ...returns];
    await persistReturns(updated);
    setIsCreateModalOpen(false);
    setNewNotes('');
    setNewGownName('');
    toast.success(`Created Return Order ${newId}`);
  };

  const handleUpdateStatus = async (rtvId: string, newStatus: ReturnOrder['status'], tracking?: string) => {
    const updated = returns.map((r) => {
      if (r.id === rtvId) {
        return {
          ...r,
          status: newStatus,
          trackingNumber: tracking || r.trackingNumber || (newStatus === 'Shipped' ? `1Z${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}` : undefined),
        };
      }
      return r;
    });
    await persistReturns(updated);
    if (selectedRtv && selectedRtv.id === rtvId) {
      setSelectedRtv(updated.find(r => r.id === rtvId) || null);
    }
    toast.success(`RTV ${rtvId} updated to ${newStatus}`);
  };

  const handleOpenInvoice = (invoiceId?: string) => {
    const inv = allInvoices.find((i) => i.id === invoiceId) || allInvoices[0] || null;
    setViewingInvoice(inv);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 font-serif">Return to Vendor (RTV)</h2>
          <p className="text-sm text-stone-500">Manage defect returns, stock balancing, sample returns, and vendor credit claims.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className={btnPrimary}>
          <Plus className="h-4 w-4" /> Create RTV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search RTVs by vendor, gown, reason, or ID..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-brand-primary focus:border-brand-primary transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-stone-500 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 font-medium shadow-sm"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Shipped">Shipped</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-stone-50/50 text-stone-500 font-medium border-b border-stone-100">
              <tr>
                <th className="px-5 py-3">RTV ID</th>
                <th className="px-5 py-3">Vendor / Designer</th>
                <th className="px-5 py-3">Gown / Reason</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Total Value</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredReturns.map((rtv) => (
                <tr 
                  key={rtv.id} 
                  onClick={() => setSelectedRtv(rtv)}
                  className="hover:bg-stone-50/70 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-4 font-bold text-stone-900 flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-stone-400" /> {rtv.id}
                  </td>
                  <td className="px-5 py-4 font-medium text-stone-700">{rtv.vendor}</td>
                  <td className="px-5 py-4 text-stone-600">
                    <div className="font-semibold text-stone-800 text-xs">{rtv.gownName || 'Bridal Merchandise'}</div>
                    <div className="text-[11px] text-stone-400">{rtv.reason}</div>
                  </td>
                  <td className="px-5 py-4 text-stone-600">{rtv.items} Gowns</td>
                  <td className="px-5 py-4 text-stone-900 font-medium">{formatCurrency(rtv.value)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusColor(rtv.status)}`}>
                      {rtv.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-stone-500">{rtv.date}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setInspectingGown(rtv)}
                        title="Inspect Gown"
                        className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                      >
                        <ShieldCheck className="h-4 w-4 text-violet-600" />
                      </button>
                      <button
                        onClick={() => setPrintingLabelRtv(rtv)}
                        title="Print RTV Label"
                        className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                      >
                        <Printer className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => setSelectedRtv(rtv)}
                        className="p-1.5 text-stone-400 hover:text-brand-primary rounded-lg transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredReturns.length === 0 && (
          <div className="p-12 flex flex-col items-center justify-center text-stone-500">
            <PackageX className="h-8 w-8 text-stone-300 mb-3" />
            <p>No returns matching your search criteria.</p>
          </div>
        )}
      </div>

      {/* ─── CREATE RTV MODAL ─── */}
      {isCreateModalOpen && (
        <Modal open={true} onClose={() => setIsCreateModalOpen(false)} title="Create Return to Vendor (RTV)">
          <form onSubmit={handleCreateRtv} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Vendor / Designer</label>
              <select
                value={newVendor}
                onChange={(e) => setNewVendor(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900"
              >
                <option>Maggie Sottero</option>
                <option>Justin Alexander</option>
                <option>Essense of Australia</option>
                <option>Berta</option>
                <option>Monique Lhuillier</option>
                <option>Allure Bridals</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Gown Name / Item SKU</label>
              <input
                type="text"
                placeholder="e.g. Derrick (Size 10, Ivory)"
                value={newGownName}
                onChange={(e) => setNewGownName(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newItemsCount}
                  onChange={(e) => setNewItemsCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Estimated Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newValueCents / 100}
                  onChange={(e) => setNewValueCents(Math.round(parseFloat(e.target.value) * 100) || 0)}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Return Reason</label>
              <select
                value={newReason}
                onChange={(e) => setNewReason(e.target.value as any)}
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900"
              >
                <option>Defective Merchandise</option>
                <option>Stock Balancing</option>
                <option>Sample Return</option>
                <option>Customer Cancellation</option>
                <option>Size Discrepancy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Notes / Defect Details</label>
              <textarea
                rows={3}
                placeholder="Describe reason for return or authorization details..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className={btnSecondary}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary}>
                Submit Return Order
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── RTV DETAIL MODAL ─── */}
      {selectedRtv && (
        <Modal open={true} onClose={() => setSelectedRtv(null)} title={`Return Order ${selectedRtv.id}`}>
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-stone-900">{selectedRtv.vendor}</h3>
                <p className="text-sm text-stone-500">{selectedRtv.gownName || 'Bridal Gowns'}</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(selectedRtv.status)}`}>
                {selectedRtv.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-100 text-xs">
              <div>
                <p className="text-stone-400 font-medium">Quantity</p>
                <p className="font-bold text-stone-800 text-sm mt-0.5">{selectedRtv.items} Units</p>
              </div>
              <div>
                <p className="text-stone-400 font-medium">Total Value</p>
                <p className="font-bold text-stone-800 text-sm mt-0.5">{formatCurrency(selectedRtv.value)}</p>
              </div>
              <div>
                <p className="text-stone-400 font-medium">Return Reason</p>
                <p className="font-bold text-stone-800 text-sm mt-0.5">{selectedRtv.reason}</p>
              </div>
              <div>
                <p className="text-stone-400 font-medium">Date Initiated</p>
                <p className="font-bold text-stone-800 text-sm mt-0.5">{selectedRtv.date}</p>
              </div>
            </div>

            {selectedRtv.trackingNumber && (
              <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">{selectedRtv.carrier || 'Carrier'}: <span className="font-mono">{selectedRtv.trackingNumber}</span></span>
                </div>
                <span className="font-bold text-blue-700 uppercase tracking-wider text-[10px]">In Transit</span>
              </div>
            )}

            {selectedRtv.notes && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Inspector & Return Notes</p>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-sm text-stone-700">
                  {selectedRtv.notes}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectingGown(selectedRtv)}
                  className="px-3 py-2 bg-violet-50 text-violet-700 hover:bg-violet-100 font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" /> Inspect Gown
                </button>
                <button
                  onClick={() => setPrintingLabelRtv(selectedRtv)}
                  className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="h-4 w-4" /> Print RTV Label
                </button>
                <button
                  onClick={() => handleOpenInvoice(selectedRtv.invoiceId)}
                  className="px-3 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="h-4 w-4" /> View Invoice
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedRtv.status === 'Draft' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedRtv.id, 'Pending Approval')}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Submit for Approval
                  </button>
                )}
                {selectedRtv.status === 'Pending Approval' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedRtv.id, 'Shipped')}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Mark as Shipped
                  </button>
                )}
                {selectedRtv.status === 'Shipped' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedRtv.id, 'Refunded')}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Confirm Refund / Credit
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── GOWN INSPECTION MODAL ─── */}
      {inspectingGown && (
        <Modal open={true} onClose={() => setInspectingGown(null)} title="Gown Quality Inspection & Triage">
          <div className="space-y-4">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex items-center justify-between">
              <div>
                <p className="font-bold text-stone-900">{inspectingGown.gownName || inspectingGown.vendor}</p>
                <p className="text-stone-500">Return Ref: {inspectingGown.id}</p>
              </div>
              <span className="font-bold text-stone-700">{formatCurrency(inspectingGown.value)}</span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Physical Inspection Checklist</p>
              <div className="space-y-2">
                {[
                  'Fabric & Lace condition (No tears, pulls, or stains)',
                  'Zipper, buttons, and fasteners fully intact',
                  'Beading & sequin embellishments secure',
                  'Train and hemline undamaged',
                ].map((item, idx) => (
                  <label key={idx} className="flex items-center gap-2.5 p-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-700 cursor-pointer hover:bg-stone-50">
                    <input type="checkbox" defaultChecked={idx < 2} className="rounded text-brand-primary focus:ring-brand-primary" />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Triage Decision</p>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => {
                    toast.success('Gown graded Pristine - restored to active inventory');
                    setInspectingGown(null);
                  }}
                  className="p-2.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold text-center transition-colors"
                >
                  Restock
                </button>
                <button 
                  onClick={() => {
                    handleUpdateStatus(inspectingGown.id, 'Pending Approval');
                    toast.success('Approved for Vendor Return (RTV)');
                    setInspectingGown(null);
                  }}
                  className="p-2.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold text-center transition-colors"
                >
                  Approve RTV
                </button>
                <button 
                  onClick={() => {
                    toast.info('Sent to internal Alterations for repair');
                    setInspectingGown(null);
                  }}
                  className="p-2.5 bg-violet-50 border border-violet-200 hover:bg-violet-100 text-violet-800 rounded-lg text-xs font-bold text-center transition-colors"
                >
                  Alterations
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── PRINTABLE RTV SHIPPING LABEL MODAL ─── */}
      {printingLabelRtv && (
        <Modal open={true} onClose={() => setPrintingLabelRtv(null)} title="RTV Shipping Label & Manifest">
          <div className="space-y-4">
            <div className="border-2 border-stone-800 p-5 rounded-lg bg-white text-stone-900 font-mono text-xs space-y-4 shadow-inner">
              <div className="flex justify-between items-start border-b-2 border-stone-800 pb-3">
                <div>
                  <p className="font-bold text-sm tracking-wider">PRIORITY RETURN</p>
                  <p className="text-[10px] text-stone-600">CARRIER: {printingLabelRtv.carrier || 'UPS GROUND'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-stone-500">RMA #</p>
                  <p className="font-bold text-sm">{printingLabelRtv.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-stone-300 pb-3">
                <div>
                  <p className="text-[10px] text-stone-400 uppercase font-sans font-bold">Ship From:</p>
                  <p className="font-bold text-[11px] font-sans">{locationById(activeLocation)?.business || 'VowOS Bridal'}</p>
                  <p className="text-[10px] text-stone-600 font-sans">{locationById(activeLocation)?.city || 'Baton Rouge'}, LA</p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-400 uppercase font-sans font-bold">Ship To (Vendor):</p>
                  <p className="font-bold text-[11px] font-sans">{printingLabelRtv.vendor}</p>
                  <p className="text-[10px] text-stone-600 font-sans">Returns Dept / Dock B</p>
                  <p className="text-[10px] text-stone-600 font-sans">Salt Lake City, UT 84101</p>
                </div>
              </div>

              <div className="text-center py-2 bg-stone-50 border border-stone-200 rounded">
                <div className="font-barcode text-3xl tracking-widest py-1">||||| | |||| ||| ||||||| ||||</div>
                <p className="text-[10px] font-sans font-semibold text-stone-700">TRACKING: {printingLabelRtv.trackingNumber || '1Z-999-RTV-8042-US'}</p>
              </div>

              <div className="text-[10px] text-stone-500 font-sans pt-1 flex justify-between">
                <span>Items: {printingLabelRtv.items} Gowns</span>
                <span>Decl. Value: {formatCurrency(printingLabelRtv.value)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setPrintingLabelRtv(null)} className={btnSecondary}>
                Close
              </button>
              <button 
                onClick={() => {
                  window.print();
                }} 
                className={btnPrimary}
              >
                <Printer className="h-4 w-4" /> Print Label
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── INVOICE DETAIL MODAL ─── */}
      {viewingInvoice && (
        <Modal open={true} onClose={() => setViewingInvoice(null)} title={`Invoice ${viewingInvoice.id}`}>
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Customer:</span>
                <span className="font-bold text-stone-900">{viewingInvoice.customer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Invoice Total:</span>
                <span className="font-bold text-stone-900">{formatCents(viewingInvoice.amountCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Amount Paid:</span>
                <span className="font-bold text-emerald-600">{formatCents(viewingInvoice.paidCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Status:</span>
                <span className="font-bold uppercase tracking-wider">{viewingInvoice.status}</span>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setViewingInvoice(null)} className={btnPrimary}>
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
