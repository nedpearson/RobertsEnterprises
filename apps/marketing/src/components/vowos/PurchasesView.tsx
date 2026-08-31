import { useStylistNames } from '@/lib/staff/useStylistNames';
import { useState, useEffect } from 'react';
import { PackageSearch, Truck, CheckCircle2, Loader2, Globe, KeyRound, Eye, EyeOff, Copy, ExternalLink, Plus, Search, Building2, Calendar, AlertTriangle, User, Sparkles, BarChart3, ArrowUpRight, Clock, ShieldCheck, FileText, DollarSign, Trash2, Archive, RotateCcw, Pencil, UserCheck } from 'lucide-react';
import { formatCents, formatDate, LOCATIONS, locationById, PurchaseOrder } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { PageHeader, StatusBadge, StatCard, Modal, inputCls, btnPrimary, btnSecondary, BeautifulEmptyState } from './ui';
import { getVendorPortals, saveVendorPortal, VendorPortal } from '@/lib/services/vendorPortalStore';
import { toast } from '@vowos/design-system';

import PODetailDrilldownModal from '@/features/inventory/components/PODetailDrilldownModal';
import { catalogService } from '@/lib/services/catalogService';
import { Vendor, Product, ProductVariant } from '@/types/catalog';
import { useBusinessId } from '@/hooks/useBusinessId';

export default function PurchasesView() {
  const teamMembers = useStylistNames();
  const businessId = useBusinessId();
  const { purchaseOrders: list, brides, loading, markPoDelivered, updatePoStatus, updatePurchaseOrder, deletePurchaseOrder, addPurchaseOrder } = useVowosData();
  const [activeTab, setActiveTab] = useState<'orders' | 'vault' | 'customers' | 'analytics'>('orders');
  const [selectedDrilldownPo, setSelectedDrilldownPo] = useState<PurchaseOrder | null>(null);

  // Search & Filter controls
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');

  // Vendor Credentials Vault State
  const [portals, setPortals] = useState<VendorPortal[]>([]);
  const [showPassMap, setShowPassMap] = useState<Record<string, boolean>>({});

  // Modal States
  const [showNewPoModal, setShowNewPoModal] = useState(false);
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [editingPortal, setEditingPortal] = useState<VendorPortal | null>(null);
  const [deletePoId, setDeletePoId] = useState<string | null>(null);

  // Edit PO State
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);
  const [editVendor, setEditVendor] = useState('Justin Alexander');
  const [editItems, setEditItems] = useState('');
  const [editAmountDollars, setEditAmountDollars] = useState('');
  const [editEta, setEditEta] = useState('');
  const [editLocation, setEditLocation] = useState<any>('ido-cov');
  const [editStaff, setEditStaff] = useState('Dana R.');
  const [editCustomer, setEditCustomer] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const handleOpenEditPo = (po: PurchaseOrder) => {
    setEditingPo(po);
    setEditVendor(po.vendor);
    setEditItems(po.items);
    setEditAmountDollars((po.amountCents / 100).toFixed(2));
    setEditEta(po.expectedDelivery);
    setEditLocation(po.location);
    setEditStaff(po.assignedStaff || teamMembers[0]);
    setEditCustomer(po.assignedCustomer || '');
    setEditNotes(po.notes || '');
  };

  const handleSaveEditPo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPo) return;
    const amountCents = Math.round(parseFloat(editAmountDollars || '0') * 100);
    const success = await updatePurchaseOrder(editingPo.id, {
      vendor: editVendor,
      items: editItems,
      amountCents: amountCents > 0 ? amountCents : editingPo.amountCents,
      expectedDelivery: editEta,
      location: editLocation,
      assignedStaff: editStaff,
      assignedCustomer: editCustomer,
      notes: editNotes,
    });
    if (success) {
      setEditingPo(null);
      toast({
        title: 'Purchase Order Updated',
        description: `${editingPo.id} assigned to ${editStaff} and linked to ${editCustomer || 'Store Stock'}.`,
      });
    }
  };

  const handleStatusChange = async (poId: string, newStatus: PurchaseOrder['status']) => {
    const success = await updatePoStatus(poId, newStatus);
    if (success) {
      toast({
        title: 'Status Updated',
        description: `${poId} status changed to "${newStatus}".`,
      });
    }
  };

  const handleDeletePoConfirm = async () => {
    if (!deletePoId) return;
    const targetId = deletePoId;
    const success = await deletePurchaseOrder(targetId);
    setDeletePoId(null);
    if (success) {
      toast({
        title: 'Purchase Order Deleted',
        description: `${targetId} has been deleted.`,
      });
    }
  };

  // New PO Form & Auto Ingest
  const [newVendor, setNewVendor] = useState('Justin Alexander');
  const [newItems, setNewItems] = useState('');
  const [newAmountDollars, setNewAmountDollars] = useState('');
  const [newEta, setNewEta] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [rawIngestText, setRawIngestText] = useState('');
  const [submittingPo, setSubmittingPo] = useState(false);

  // Portal Form
  const [portalName, setPortalName] = useState('');
  const [portalBrand, setPortalBrand] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [portalUsername, setPortalUsername] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [portalDealerId, setPortalDealerId] = useState('');
  const [portalRepName, setPortalRepName] = useState('');
  const [portalRepPhone, setPortalRepPhone] = useState('');
  const [portalRepEmail, setPortalRepEmail] = useState('');
  const [portalLeadTimeDays, setPortalLeadTimeDays] = useState('40');

  const [catalogVendors, setCatalogVendors] = useState<Vendor[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogVariants, setCatalogVariants] = useState<ProductVariant[]>([]);

  useEffect(() => {
    getVendorPortals().then(setPortals);
    catalogService.getVendors(businessId).then(setCatalogVendors).catch(console.error);
  }, []);

  useEffect(() => {
    if (newVendor && catalogVendors.some(v => v.id === newVendor)) {
      catalogService.getVendorProducts(businessId, newVendor).then(setCatalogProducts).catch(console.error);
    } else {
      setCatalogProducts([]);
    }
  }, [newVendor, catalogVendors]);

  const togglePasswordVisibility = (id: string) => {
    setShowPassMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to Clipboard', description: `${label} copied.` });
  };

  const handleOpenEditPortal = (p?: VendorPortal) => {
    if (p) {
      setEditingPortal(p);
      setPortalName(p.name);
      setPortalBrand(p.brand);
      setPortalUrl(p.portalUrl);
      setPortalUsername(p.username);
      setPortalPassword(p.password || '');
      setPortalDealerId(p.dealerId);
      setPortalRepName(p.repName);
      setPortalRepPhone(p.repPhone);
      setPortalRepEmail(p.repEmail);
      setPortalLeadTimeDays(String(p.avgLeadTimeDays));
    } else {
      setEditingPortal(null);
      setPortalName('');
      setPortalBrand('');
      setPortalUrl('');
      setPortalUsername('');
      setPortalPassword('');
      setPortalDealerId('');
      setPortalRepName('');
      setPortalRepPhone('');
      setPortalRepEmail('');
      setPortalLeadTimeDays('40');
    }
    setShowPortalModal(true);
  };

  const handleSavePortal = async (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: VendorPortal = {
      id: editingPortal ? editingPortal.id : `v-${Date.now()}`,
      name: portalName.trim(),
      brand: portalBrand.trim() || portalName.trim(),
      portalUrl: portalUrl.trim(),
      username: portalUsername.trim(),
      password: portalPassword.trim(),
      dealerId: portalDealerId.trim(),
      repName: portalRepName.trim(),
      repPhone: portalRepPhone.trim(),
      repEmail: portalRepEmail.trim(),
      avgLeadTimeDays: parseInt(portalLeadTimeDays) || 30,
    };
    const updated = await saveVendorPortal(newEntry);
    setPortals(updated);
    setShowPortalModal(false);
    toast({ title: 'Vendor Portal Vault Updated', description: `${newEntry.name} credentials saved.` });
  };

  // Auto Ingest Parser logic
  const handleAutoIngest = () => {
    if (!rawIngestText.trim()) return;
    const text = rawIngestText;
    
    // Look for items or gown names
    let matchedItem = 'Special Order Gown & Accessories';
    if (text.toLowerCase().includes('justin alexander')) setNewVendor('Justin Alexander');
    else if (text.toLowerCase().includes('pronovias')) setNewVendor('Pronovias');
    else if (text.toLowerCase().includes('essense')) setNewVendor('Essense of Australia');
    else if (text.toLowerCase().includes('morilee')) setNewVendor('Morilee');

    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length > 0) {
      matchedItem = lines[0].slice(0, 80);
    }
    setNewItems(matchedItem);

    // Look for amounts e.g. $1,850 or 1850
    const priceMatch = text.match(/\$?([0-9,]+(?:\.[0-9]{2})?)/);
    if (priceMatch) {
      const parsedDollars = priceMatch[1].replace(',', '');
      setNewAmountDollars(parsedDollars);
    }

    // Default ETA + 45 days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 45);
    setNewEta(futureDate.toISOString().slice(0, 10));

    toast({ title: 'Vendor Confirmation Parsed', description: 'Populated PO details from confirmation payload.' });
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPo(true);
    const amountCents = Math.round(parseFloat(newAmountDollars || '0') * 100);
    const vendorName = catalogVendors.find(v => v.id === newVendor)?.name || newVendor;
    const success = await addPurchaseOrder({
      vendor: vendorName,
      items: newItems + (newCustomer ? ` (Bride: ${newCustomer})` : ''),
      amountCents: amountCents > 0 ? amountCents : 150000,
      expectedDelivery: newEta || new Date().toISOString().slice(0, 10),
    });
    setSubmittingPo(false);
    if (success) {
      setShowNewPoModal(false);
      setNewItems('');
      setNewAmountDollars('');
      setRawIngestText('');
      toast({ title: 'Purchase Order Created', description: `PO created and linked to ${vendorName}.` });
    }
  };

  // Metrics
  const openOrders = list.filter((p) => p.status !== 'Delivered');
  const inTransit = list.filter((p) => p.status === 'In Transit' || p.status === 'Ordered');
  const openValue = openOrders.reduce((s, p) => s + p.amountCents, 0);
  const delayedCount = list.filter((p) => p.status === 'Delayed').length;

  const filteredOrders = list.filter((po) => {
    const q = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (po.id || '').toLowerCase().includes(q) ||
      (po.vendor || '').toLowerCase().includes(q) ||
      (po.items || '').toLowerCase().includes(q) ||
      (po.assignedStaff && po.assignedStaff.toLowerCase().includes(q)) ||
      (po.assignedCustomer && po.assignedCustomer.toLowerCase().includes(q));
    const matchesVendor = vendorFilter === 'all' || po.vendor === vendorFilter;
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    const matchesStaff = staffFilter === 'all' || po.assignedStaff === staffFilter;
    return matchesSearch && matchesVendor && matchesStatus && matchesStaff;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchasing & Designer Portals"
        subtitle="Manage vendor ordering portals, credentials vault, special order tracking, and lead-time analytics"
        action={
          <div className="flex items-center gap-2">
            <button
              data-tour-id="btn-vendor-vault"
              onClick={() => handleOpenEditPortal()}
              className={btnSecondary}
            >
              <KeyRound className="h-4 w-4 text-[#a98a4b]" /> Vendor Vault Credentials
            </button>
            <button
              data-tour-id="btn-new-po"
              onClick={() => setShowNewPoModal(true)}
              className={btnPrimary}
            >
              <Plus className="h-4 w-4" /> Create Purchase Order
            </button>
          </div>
        }
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open Purchase Orders" value={String(openOrders.length)} sub={`${delayedCount} flagged delayed`} icon={<PackageSearch className="h-5 w-5" />} accent="violet" />
        <StatCard label="In Transit & Ordered" value={String(inTransit.length)} sub="Active factory runs" icon={<Truck className="h-5 w-5" />} accent="amber" />
        <StatCard label="Total Open PO Value" value={formatCents(openValue)} sub="Wholesale committed" icon={<DollarSign className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Designer Portals Vault" value={String(portals.length)} sub="Saved dealer logins" icon={<Globe className="h-5 w-5" />} accent="rose" />
      </div>

      {/* Navigation Tabs */}
      <div data-tour-id="tabs-purchases" className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'orders'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <PackageSearch className="h-4 w-4" /> All Purchase Orders ({list.length})
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'vault'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Globe className="h-4 w-4 text-sky-600" /> Designer Portals &amp; Vault ({portals.length})
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'customers'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <User className="h-4 w-4 text-brand-primary" /> Customer Special Orders
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'analytics'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <BarChart3 className="h-4 w-4 text-status-success" /> Lead Times &amp; Analytics
        </button>
      </div>

      {/* TAB 1: ALL PURCHASE ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-sm max-w-md">
              <Search className="h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search PO #, vendor, or gown style..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-stone-400 text-xs"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 outline-none"
              >
                <option value="all">All Vendors</option>
                <option value="Justin Alexander">Justin Alexander</option>
                <option value="Pronovias">Pronovias</option>
                <option value="Essense of Australia">Essense of Australia</option>
                <option value="Morilee">Morilee</option>
                <option value="Veil & Co.">Veil &amp; Co.</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Ordered">Ordered</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Delayed">Delayed</option>
                <option value="Archived">Archived</option>
              </select>

              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 outline-none"
              >
                <option value="all">All Staff / Stylists</option>
                {teamMembers.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center rounded-2xl border border-stone-200/80 bg-white py-16 shadow-sm">
              <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
              <p className="mt-3 text-sm text-stone-500">Loading purchase orders...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((po) => {
                const vendorPortal = portals.find((p) => p.brand.toLowerCase() === po.vendor.toLowerCase());
                return (
                  <div key={po.id} className="flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                      <PackageSearch className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 cursor-pointer group" onClick={() => setSelectedDrilldownPo(po)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-stone-900 group-hover:text-brand-primary transition-colors flex items-center gap-1">
                          {po.id} <Eye className="h-3.5 w-3.5 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                        <StatusBadge status={po.status} />
                        {po.assignedStaff && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-0.5 text-[10px] font-bold text-violet-700">
                            <UserCheck className="h-3 w-3" /> Staff: {po.assignedStaff}
                          </span>
                        )}
                        {po.assignedCustomer && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft border border-border-subtle px-2.5 py-0.5 text-[10px] font-bold text-brand-primary-hover">
                            <User className="h-3 w-3" /> Bride: {po.assignedCustomer}
                          </span>
                        )}
                        {vendorPortal && (
                          <a
                            href={vendorPortal.portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold text-stone-600 hover:bg-stone-200"
                          >
                            <Globe className="h-3 w-3 text-sky-600" /> {vendorPortal.name} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                      <p className="mt-1 font-medium text-sm text-stone-800">{po.items}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        <span className="font-semibold text-stone-700">{po.vendor}</span> · Ordered {formatDate(po.ordered)} · ETA {formatDate(po.expectedDelivery)} · {locationById(po.location).short}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-right">
                        <p className="font-serif text-lg font-bold text-stone-900">{formatCents(po.amountCents)}</p>
                        <span className="text-[10px] text-stone-400 font-mono">Wholesale PO</span>
                      </div>

                      {/* Interactive Reversible Status Dropdown */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold">
                          <span className="text-[10px] text-stone-400 uppercase font-bold">Status:</span>
                          <select
                            value={po.status}
                            onChange={(e) => handleStatusChange(po.id, e.target.value as PurchaseOrder['status'])}
                            className="bg-transparent font-bold text-stone-800 outline-none cursor-pointer"
                          >
                            <option value="Ordered">Ordered</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Delivered">Delivered (Received)</option>
                            <option value="Delayed">Delayed</option>
                            <option value="Archived">Archived</option>
                          </select>
                        </div>

                        {/* Edit PO & Reassign Button */}
                        <button
                          onClick={() => handleOpenEditPo(po)}
                          title="Edit PO & Reassign Staff/Customer"
                          className="rounded-xl border border-stone-200 p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* Archive Button */}
                        <button
                          onClick={() => handleStatusChange(po.id, po.status === 'Archived' ? 'Ordered' : 'Archived')}
                          title={po.status === 'Archived' ? 'Unarchive PO' : 'Archive PO'}
                          className={`rounded-xl border p-2 transition-colors ${
                            po.status === 'Archived'
                              ? 'border-amber-300 bg-status-warning/10 text-amber-800'
                              : 'border-stone-200 text-stone-400 hover:bg-stone-100 hover:text-stone-700'
                          }`}
                        >
                          <Archive className="h-4 w-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeletePoId(po.id)}
                          title="Delete Purchase Order"
                          className="rounded-xl border border-stone-200 p-2 text-stone-400 hover:bg-brand-soft hover:text-brand-primary transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredOrders.length === 0 && (
                <div className="mt-4">
                  <BeautifulEmptyState
                    icon={<PackageSearch className="h-8 w-8" />}
                    title="No Purchases Found"
                    description="No matching purchase orders found."
                    colorHint="indigo"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DESIGNER PORTALS & VAULT */}
      {activeTab === 'vault' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-status-warning/20/80 bg-status-warning/10/60 p-4 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-status-warning flex-shrink-0" />
              <p>
                <span className="font-bold">Designer Credential Vault</span>: Secure store for Ramsey Sims &amp; purchasing agents. Quick launch retailer ordering portals with 1-click credential copying and auto-ingestion.
              </p>
            </div>
            <button onClick={() => handleOpenEditPortal()} className={btnPrimary}>
              <Plus className="h-3.5 w-3.5" /> Add Designer Portal
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {portals.map((p) => {
              const showPass = showPassMap[p.id] || false;
              return (
                <div key={p.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                        {p.brand}
                      </span>
                      <h4 className="text-base font-semibold text-stone-900 mt-1">{p.name}</h4>
                    </div>
                    <a
                      href={p.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700 shadow-xs"
                    >
                      Launch Portal <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* Credentials Section */}
                  <div className="rounded-xl border border-stone-100 bg-stone-50/80 p-3 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400 font-sans font-medium text-[11px]">Portal Login Email:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-stone-800">{p.username}</span>
                        <button onClick={() => copyToClipboard(p.username, 'Username')} className="text-stone-400 hover:text-stone-700">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-stone-200/60 pt-2">
                      <span className="text-stone-400 font-sans font-medium text-[11px]">Vault Password:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-stone-800">{showPass ? p.password : '••••••••••••'}</span>
                        <button onClick={() => togglePasswordVisibility(p.id)} className="text-stone-400 hover:text-stone-700">
                          {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        {p.password && (
                          <button onClick={() => copyToClipboard(p.password!, 'Password')} className="text-stone-400 hover:text-stone-700">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-stone-200/60 pt-2">
                      <span className="text-stone-400 font-sans font-medium text-[11px]">Dealer / Acct ID:</span>
                      <span className="font-bold text-status-warning">{p.dealerId}</span>
                    </div>
                  </div>

                  {/* Representative Contact */}
                  <div className="text-xs text-stone-600 space-y-1">
                    <p className="font-semibold text-stone-800">Account Executive: {p.repName}</p>
                    <p className="text-stone-500">{p.repEmail} · {p.repPhone}</p>
                    <p className="text-[11px] text-stone-400">Est. Lead Time: <span className="font-bold text-stone-700">{p.avgLeadTimeDays} days</span></p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex justify-end">
                    <button onClick={() => handleOpenEditPortal(p)} className="text-xs font-semibold text-stone-600 hover:text-stone-900">
                      Edit Credentials
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER SPECIAL ORDERS */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-stone-900">Bride Special Order Matrix &amp; Wedding Date Runways</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="pb-3">Bride / Customer</th>
                    <th className="pb-3">Wedding Date</th>
                    <th className="pb-3">PO Number &amp; Items</th>
                    <th className="pb-3">Vendor / Designer</th>
                    <th className="pb-3">Order Status</th>
                    <th className="pb-3">ETA Runway</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {list.map((po) => {
                    const bride = brides.find((b) => po.items.toLowerCase().includes(b.name.toLowerCase()));
                    const weddingDate = bride?.weddingDate || '2026-10-15';
                    return (
                      <tr key={po.id} className="hover:bg-stone-50/60">
                        <td className="py-3.5 font-semibold text-stone-900">
                          {bride ? bride.name : 'Special Order Bride'}
                          <span className="block text-[10px] text-stone-400 font-normal">{bride?.email || 'idobridal@robertsenterprises.com'}</span>
                        </td>
                        <td className="py-3.5 text-stone-700 font-medium">
                          {formatDate(weddingDate)}
                        </td>
                        <td className="py-3.5">
                          <span className="font-bold text-stone-800">{po.id}</span>
                          <span className="block text-stone-500">{po.items}</span>
                        </td>
                        <td className="py-3.5 font-medium text-stone-700">
                          {po.vendor}
                        </td>
                        <td className="py-3.5">
                          <StatusBadge status={po.status} />
                        </td>
                        <td className="py-3.5 font-mono text-stone-800">
                          ETA {formatDate(po.expectedDelivery)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PURCHASING ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-stone-900">Vendor Lead-Time &amp; Fulfillment Metrics</h4>
            <div className="space-y-4">
              {portals.map((p) => (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-stone-800">
                    <span>{p.brand}</span>
                    <span>{p.avgLeadTimeDays} Days Lead Time</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full bg-[#a98a4b]"
                      style={{ width: `${Math.min(100, (p.avgLeadTimeDays / 60) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-stone-900">Wholesale Committed vs. Retail Value</h4>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-stone-100 pb-2">
                <span className="text-stone-500">Total Open Wholesale POs:</span>
                <span className="font-mono font-bold text-stone-900">{formatCents(openValue)}</span>
              </div>
              <div className="flex justify-between border-b border-stone-100 pb-2">
                <span className="text-stone-500">Est. Retail Selling Price:</span>
                <span className="font-mono font-bold text-emerald-700">{formatCents(openValue * 2.5)}</span>
              </div>
              <div className="flex justify-between border-b border-stone-100 pb-2">
                <span className="text-stone-500">Average Retail Markup Multiple:</span>
                <span className="font-bold text-stone-800">2.5× (60% Gross Margin)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PO & INGEST MODAL */}
      <Modal open={showNewPoModal} onClose={() => setShowNewPoModal(false)} title="Create Purchase Order & Vendor Ingestion">
        <form onSubmit={handleCreatePo} className="space-y-4">
          {/* Quick Auto Ingest Box */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-sky-900">
              <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-sky-600" /> Vendor Confirmation Ingestion</span>
              <button type="button" onClick={handleAutoIngest} className="text-sky-700 hover:text-sky-900 underline">Parse Text</button>
            </div>
            <textarea
              rows={2}
              placeholder="Paste raw vendor confirmation email or order payload here to auto-fill..."
              value={rawIngestText}
              onChange={(e) => setRawIngestText(e.target.value)}
              className="w-full rounded-lg border border-sky-200 bg-white p-2 text-xs outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Vendor / Designer (From Catalog)</label>
              <select value={newVendor} onChange={(e) => setNewVendor(e.target.value)} className={inputCls}>
                <option value="">-- Choose Vendor --</option>
                {catalogVendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Link Bride / Customer</label>
              <select value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} className={inputCls}>
                <option value="">Store Stock Restock (No Customer)</option>
                {brides.map((b) => (
                  <option key={b.id} value={b.name}>{b.name} (Wedding: {formatDate(b.weddingDate)})</option>
                ))}
              </select>
            </div>
          </div>

          {catalogProducts.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Select Product (Optional)</label>
              <select
                className={inputCls}
                onChange={(e) => {
                  const p = catalogProducts.find(prod => prod.id === e.target.value);
                  if (p) {
                    setNewItems(`${p.name} (Style: ${p.style_number})`);
                  }
                }}
              >
                <option value="">-- Choose Product --</option>
                {catalogProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.style_number})</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 block">Order Items &amp; Description</label>
            <input type="text" placeholder="e.g. Odette gown (sz 8) custom ivory" value={newItems} onChange={(e) => setNewItems(e.target.value)} className={inputCls} required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Wholesale Amount ($)</label>
              <input type="number" placeholder="1850" value={newAmountDollars} onChange={(e) => setNewAmountDollars(e.target.value)} className={inputCls} required />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Expected Arrival ETA</label>
              <input type="date" value={newEta} onChange={(e) => setNewEta(e.target.value)} className={inputCls} required />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-stone-100">
            <button type="button" onClick={() => setShowNewPoModal(false)} className={btnSecondary}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={submittingPo}>
              {submittingPo ? 'Submitting...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* PORTAL VAULT CREDENTIALS MODAL */}
      <Modal open={showPortalModal} onClose={() => setShowPortalModal(false)} title={editingPortal ? 'Edit Designer Portal Credentials' : 'Add Designer Portal Credentials'}>
        <form onSubmit={handleSavePortal} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Portal Title</label>
              <input type="text" placeholder="Justin Alexander Retailer Portal" value={portalName} onChange={(e) => setPortalName(e.target.value)} className={inputCls} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Brand Name</label>
              <input type="text" placeholder="Justin Alexander" value={portalBrand} onChange={(e) => setPortalBrand(e.target.value)} className={inputCls} required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 block">Portal Website URL</label>
            <input type="url" placeholder="https://portal.justinalexander.com" value={portalUrl} onChange={(e) => setPortalUrl(e.target.value)} className={inputCls} required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Login Username / Email</label>
              <input type="text" placeholder="ramsey@robertsenterprises.com" value={portalUsername} onChange={(e) => setPortalUsername(e.target.value)} className={inputCls} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Vault Password</label>
              <input type="password" placeholder="••••••••••••" value={portalPassword} onChange={(e) => setPortalPassword(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Dealer Account #</label>
              <input type="text" placeholder="JA-LA-0491" value={portalDealerId} onChange={(e) => setPortalDealerId(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Account Rep Name</label>
              <input type="text" placeholder="Clara Vance" value={portalRepName} onChange={(e) => setPortalRepName(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Est Lead Time (Days)</label>
              <input type="number" placeholder="42" value={portalLeadTimeDays} onChange={(e) => setPortalLeadTimeDays(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-stone-100">
            <button type="button" onClick={() => setShowPortalModal(false)} className={btnSecondary}>Cancel</button>
            <button type="submit" className={btnPrimary}>Save Credentials</button>
          </div>
        </form>
      </Modal>

      {/* EDIT PO MODAL */}
      {editingPo && (
        <Modal open={!!editingPo} onClose={() => setEditingPo(null)} title={`Edit Purchase Order ${editingPo.id}`}>
          <form onSubmit={handleSaveEditPo} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 block">Vendor / Designer</label>
                <select value={editVendor} onChange={(e) => setEditVendor(e.target.value)} className={inputCls}>
                  <option value="Justin Alexander">Justin Alexander</option>
                  <option value="Pronovias">Pronovias</option>
                  <option value="Essense of Australia">Essense of Australia</option>
                  <option value="Morilee">Morilee</option>
                  <option value="Veil & Co.">Veil &amp; Co.</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 block">Boutique Location</label>
                <select value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className={inputCls}>
                  {LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.short} ({loc.address})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 block">Assign Staff / Stylist</label>
                <select value={editStaff} onChange={(e) => setEditStaff(e.target.value)} className={inputCls}>
                  {teamMembers.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 block">Assign Customer / Bride</label>
                <select value={editCustomer} onChange={(e) => setEditCustomer(e.target.value)} className={inputCls}>
                  <option value="">Store Stock Restock (No Customer)</option>
                  {brides.map((b) => (
                    <option key={b.id} value={b.name}>{b.name} (Wedding: {formatDate(b.weddingDate)})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Order Items &amp; Description</label>
              <input type="text" value={editItems} onChange={(e) => setEditItems(e.target.value)} className={inputCls} required />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 block">Wholesale Amount ($)</label>
                <input type="number" step="0.01" value={editAmountDollars} onChange={(e) => setEditAmountDollars(e.target.value)} className={inputCls} required />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 block">Expected Arrival ETA</label>
                <input type="date" value={editEta} onChange={(e) => setEditEta(e.target.value)} className={inputCls} required />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Internal Notes &amp; Special Instructions</label>
              <textarea rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className={inputCls} placeholder="e.g. Custom 3-inch hem reduction requested from factory..." />
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-stone-100">
              <button type="button" onClick={() => setEditingPo(null)} className={btnSecondary}>Cancel</button>
              <button type="submit" className={btnPrimary}>Save Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE PO CONFIRMATION MODAL */}
      {deletePoId && (
        <Modal open={!!deletePoId} onClose={() => setDeletePoId(null)} title={`Delete Purchase Order ${deletePoId}`}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-brand-primary bg-brand-soft p-3 rounded-xl border border-border-subtle">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p className="text-xs font-semibold">
                Are you sure you want to permanently delete <span className="font-bold">{deletePoId}</span>? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-stone-100">
              <button type="button" onClick={() => setDeletePoId(null)} className={btnSecondary}>Cancel</button>
              <button
                type="button"
                onClick={handleDeletePoConfirm}
                className="rounded-xl bg-brand-primary-hover px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
              >
                Delete Purchase Order
              </button>
            </div>
          </div>
        </Modal>
      )}

      <PODetailDrilldownModal po={selectedDrilldownPo} onClose={() => setSelectedDrilldownPo(null)} />
    </div>
  );
}
