import { useState } from 'react';
import { InventoryCountSession } from '../types/properCommerceTypes';
import { createCountSession, submitCountSession, approveCountSession } from '../api/properCommerceApi';
import { Modal } from '@/components/vowos/ui';
import { ClipboardList, Plus, Barcode, EyeOff, CheckCircle2, AlertTriangle, Check, X, Search, Scan } from 'lucide-react';
import { toast } from '@vowos/design-system';

interface InventoryCountManagerProps {
  sessions: InventoryCountSession[];
  onUpdate: () => void;
}

export default function InventoryCountManager({ sessions, onUpdate }: InventoryCountManagerProps) {
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<'pc-br' | 'pc-cov'>('pc-br');
  const [scope, setScope] = useState<'Full Store' | 'Category' | 'Vendor'>('Full Store');
  const [blindCount, setBlindCount] = useState(true);
  const [creating, setCreating] = useState(false);

  // Active Count Modal State
  const [activeSession, setActiveSession] = useState<InventoryCountSession | null>(null);
  const [scanSku, setScanSku] = useState('');

  const handleCreateSession = async () => {
    setCreating(true);
    try {
      const session = await createCountSession(selectedLoc, scope, blindCount, 'Manager');
      toast({ title: 'Inventory Count Created', description: `Started new ${scope} count for ${session.locationName}` });
      setNewModalOpen(false);
      onUpdate();
      setActiveSession(session);
    } catch (e: any) {
      toast({ title: 'Creation failed', description: e.message || 'Could not start count session.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleScanItem = (skuInput: string) => {
    if (!activeSession || !skuInput.trim()) return;
    const targetSku = skuInput.trim().toUpperCase();
    const line = activeSession.lines.find((l) => l.sku.toUpperCase() === targetSku || l.sku.toUpperCase().includes(targetSku));

    if (line) {
      line.countedQty += 1;
      line.varianceQty = line.countedQty - line.expectedQty;
      activeSession.scannedCount += 1;
      setActiveSession({ ...activeSession });
      toast({ title: 'Item Scanned', description: `+1 ${line.productTitle} (${line.sku})` });
      setScanSku('');
    } else {
      toast({ title: 'SKU not found', description: `No item matching SKU ${skuInput} in count session.`, variant: 'destructive' });
    }
  };

  const handleSubmitSession = async () => {
    if (!activeSession) return;
    await submitCountSession(activeSession.id);
    toast({ title: 'Count Submitted for Review', description: 'Session submitted to manager for variance approval.' });
    setActiveSession(null);
    onUpdate();
  };

  const handleApproveSession = async (session: InventoryCountSession) => {
    if (confirm(`Approve physical count variances for ${session.id}? This will post inventory adjustments.`)) {
      await approveCountSession(session.id, 'Ramsey Sims');
      toast({ title: 'Count Approved', description: 'Inventory movements posted and Shopify stock synced.' });
      onUpdate();
    }
  };

  return (
    <div className="space-y-5 select-none">
      {/* Action Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <h3 className="font-bold text-stone-900 text-sm">Physical Inventory Count Sessions</h3>
          <p className="text-xs text-stone-500">
            Conduct location stock audits for Proper Baton Rouge or Proper Covington.
          </p>
        </div>
        <button
          onClick={() => setNewModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" /> Start New Physical Count
        </button>
      </div>

      {/* Count Sessions Grid */}
      <div className="space-y-4">
        {sessions.map((s) => (
          <div key={s.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-900 text-base">{s.id}</span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                    {s.locationName}
                  </span>
                  {s.blindCount && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800">
                      <EyeOff className="h-3 w-3" /> Blind Count
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Scope: <strong>{s.scope}</strong> · Started by <strong>{s.startedBy}</strong> on {new Date(s.startedAt).toLocaleTimeString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {s.status === 'in_progress' && (
                  <button
                    onClick={() => setActiveSession(s)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-primary-hover"
                  >
                    <Scan className="h-4 w-4" /> Resume Scan
                  </button>
                )}
                {s.status === 'awaiting_approval' && (
                  <button
                    onClick={() => handleApproveSession(s)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve &amp; Post Variances
                  </button>
                )}
                {s.status === 'approved' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    <Check className="h-3.5 w-3.5" /> Approved &amp; Posted
                  </span>
                )}
              </div>
            </div>

            {/* Progress & Variance Summary */}
            <div className="grid grid-cols-3 gap-4 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
              <div>
                <p className="text-stone-500">Expected Stock</p>
                <p className="font-bold text-stone-900 text-sm">{s.totalExpected} units</p>
              </div>
              <div>
                <p className="text-stone-500">Scanned Stock</p>
                <p className="font-bold text-stone-900 text-sm">{s.scannedCount} units</p>
              </div>
              <div>
                <p className="text-stone-500">Variance</p>
                <p className={`font-bold text-sm ${s.totalVarianceUnits === 0 ? 'text-status-success' : 'text-brand-primary'}`}>
                  {s.totalVarianceUnits} units
                </p>
              </div>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-400">
            No physical inventory count sessions active. Click "Start New Physical Count" to begin.
          </div>
        )}
      </div>

      {/* Start New Count Modal */}
      <Modal open={newModalOpen} onClose={() => setNewModalOpen(false)} title="Start Physical Inventory Count">
        <div className="space-y-4 select-none">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Target Location</label>
            <select
              value={selectedLoc}
              onChange={(e) => setSelectedLoc(e.target.value as any)}
              className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs font-semibold text-stone-800"
            >
              <option value="pc-br">Proper &amp; Co — Baton Rouge</option>
              <option value="pc-cov">Proper &amp; Co — Covington</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Count Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs font-semibold text-stone-800"
            >
              <option value="Full Store">Full Store Physical Count</option>
              <option value="Category">Category Cycle Count</option>
              <option value="Vendor">Vendor Spot Count</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="blindCountCheck"
              checked={blindCount}
              onChange={(e) => setBlindCount(e.target.checked)}
              className="rounded text-brand-primary accent-rose-500"
            />
            <label htmlFor="blindCountCheck" className="text-xs font-semibold text-stone-800 cursor-pointer">
              Enable Blind Count Mode (Staff cannot see expected stock numbers while scanning)
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <button
              onClick={() => setNewModalOpen(false)}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSession}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-primary-hover"
            >
              Start Session
            </button>
          </div>
        </div>
      </Modal>

      {/* Active Count Scanner Modal */}
      {activeSession && (
        <Modal open={true} onClose={() => setActiveSession(null)} title={`Active Count — ${activeSession.id}`}>
          <div className="space-y-5 select-none">
            {/* Barcode Scanner Input */}
            <div className="flex items-center gap-2 bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <Barcode className="h-5 w-5 text-stone-500" />
              <input
                type="text"
                value={scanSku}
                onChange={(e) => setScanSku(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleScanItem(scanSku);
                }}
                placeholder="Scan barcode or enter SKU..."
                className="flex-1 bg-transparent text-sm font-bold text-stone-900 placeholder-stone-400 focus:outline-none"
                autoFocus
              />
              <button
                onClick={() => handleScanItem(scanSku)}
                className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover"
              >
                Scan Item
              </button>
            </div>

            {/* Scanned Lines Table */}
            <div className="max-h-60 overflow-y-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 text-[10px] font-bold uppercase text-stone-500 border-b">
                  <tr>
                    <th className="p-2">Item / SKU</th>
                    {!activeSession.blindCount && <th className="p-2">Expected</th>}
                    <th className="p-2">Scanned</th>
                    <th className="p-2">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeSession.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="p-2 font-semibold text-stone-900">{l.productTitle} ({l.sku})</td>
                      {!activeSession.blindCount && <td className="p-2 font-bold text-stone-700">{l.expectedQty}</td>}
                      <td className="p-2 font-bold text-brand-primary">{l.countedQty}</td>
                      <td className="p-2 font-bold">{l.varianceQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
              <button
                onClick={() => setActiveSession(null)}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
              >
                Save Progress
              </button>
              <button
                onClick={handleSubmitSession}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Submit Count for Review
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
