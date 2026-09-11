import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Users, Sparkles, Shirt, FileSignature, Receipt, ArrowRight, Truck } from 'lucide-react';
import { NAVIGATION_ITEMS, ViewKey, resolveFeatureRoute } from '@/lib/navigation/navigationRegistry';
import { useLocation, useNavigate } from 'react-router-dom';
import { isDemoAppPath, withDemoAppPrefix } from '@/lib/navigation/useApplicationRoute';
import { FEATURE_REGISTRY } from '@/data/featureRegistry';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/lib/demo/demoContext';
import { canAccessView } from '@/components/vowos/Sidebar';
import BridalIdentity from './BridalIdentity';
import { useModuleResolution } from '@/lib/modules/resolver';
import { supabase } from '@/lib/supabase';

interface CommandPaletteModalProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewKey, params?: Record<string, string>) => void;
}

export default function CommandPaletteModal({ open, onClose, onNavigate }: CommandPaletteModalProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isDemoMode, activePersona } = useDemo();
  const { resolveFeatureAvailability } = useModuleResolution();
  const role = isDemoMode ? activePersona.role : (profile?.role ?? null);

  const [searchResults, setSearchResults] = useState<{
    customers: any[];
    gowns: any[];
    leads: any[];
    contracts: any[];
    invoices: any[];
    purchase_orders: any[];
  }>({
    customers: [],
    gowns: [],
    leads: [],
    contracts: [],
    invoices: [],
    purchase_orders: [],
  });

  // Debounce the query to prevent excessive DB calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => clearTimeout(handler);
  }, [query]);

  // Execute Supabase queries when debouncedQuery changes
  useEffect(() => {
    if (!open) return;
    
    if (!debouncedQuery.trim()) {
      setSearchResults({ customers: [], gowns: [], leads: [], contracts: [], invoices: [], purchase_orders: [] });
      return;
    }

    let isActive = true;
    const q = `%${debouncedQuery.trim()}%`;

    Promise.all([
      supabase.from('customers').select('*').or(`name.ilike.${q},email.ilike.${q},phone.ilike.${q}`).limit(4),
      supabase.from('gowns').select('*').or(`name.ilike.${q},designer.ilike.${q},sku.ilike.${q}`).limit(4),
      supabase.from('leads').select('*').or(`name.ilike.${q},email.ilike.${q}`).limit(3),
      supabase.from('contracts').select('*').or(`customer.ilike.${q},id.ilike.${q}`).limit(3),
      supabase.from('invoices').select('*').or(`customer.ilike.${q},id.ilike.${q}`).limit(3),
      supabase.from('purchase_orders').select('*').or(`vendor.ilike.${q},id.ilike.${q},customer_for.ilike.${q}`).limit(3)
    ]).then(([custRes, gownRes, leadRes, contractRes, invRes, poRes]) => {
      if (!isActive) return;
      setSearchResults({
        customers: custRes.data || [],
        gowns: gownRes.data || [],
        leads: leadRes.data || [],
        contracts: contractRes.data || [],
        invoices: invRes.data || [],
        purchase_orders: poRes.data || [],
      });
    });

    return () => {
      isActive = false;
    };
  }, [debouncedQuery, open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
        else setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchResults]);

  // Compute matching items across navigation and domain entities
  const featureResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return FEATURE_REGISTRY.filter(f => {
      if (f.releaseState !== 'PRODUCTION' && f.releaseState !== 'BETA') return false;
      return f.name.toLowerCase().includes(q) || f.oneSentenceValue.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
    }).map(f => ({
      id: 'feature_' + f.id,
      type: 'feature',
      label: f.name,
      description: `Feature • ${f.workspace} • ${f.oneSentenceValue}`,
      icon: Sparkles,
      action: () => {
        navigate(withDemoAppPrefix(resolveFeatureRoute(f.route), isDemoAppPath(location.pathname)));
        onClose();
      }
    }));
  }, [debouncedQuery, navigate, location.pathname, onClose]);

  const navResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return (NAVIGATION_ITEMS || [])
        .filter((item) => {
          if (item.external) return false;
          if (!canAccessView(role, item.id as ViewKey, profile?.id)) return false;
          if (item.moduleKey && !resolveFeatureAvailability(item.moduleKey).effective) return false;
          return true;
        })
        .slice(0, 8);
    }
    const q = debouncedQuery.toLowerCase();
    return (NAVIGATION_ITEMS || []).filter((item) => {
      if (item.external) return false;
      if (!canAccessView(role, item.id as ViewKey, profile?.id)) return false;
      if (item.moduleKey && !resolveFeatureAvailability(item.moduleKey).effective) return false;
      return (
        item.label.toLowerCase().includes(q) ||
        item.shortLabel?.toLowerCase().includes(q) ||
        item.searchKeywords.some((kw) => kw.includes(q))
      );
    });
  }, [debouncedQuery, role, profile?.id, resolveFeatureAvailability]);

  // Combined selectable list for keyboard navigation
  const allResults = useMemo(() => {
    const list: { type: string; id: string; label: string; sub?: string; icon: any; action: () => void; customerObj?: any }[] = [];

    featureResults.forEach(item => {
      list.push({
        type: item.type,
        id: item.id,
        label: item.label,
        sub: item.description,
        icon: item.icon,
        action: item.action
      });
    });

    navResults.forEach((item) => {
      const Icon = item.icon;
      list.push({
        type: 'Navigation',
        id: `nav-${item.id}`,
        label: item.label,
        sub: `Go to ${item.label}`,
        icon: Icon,
        action: () => {
          onNavigate(item.id as ViewKey);
          onClose();
        },
      });
    });

    if (canAccessView(role, 'customers', profile?.id)) {
      searchResults.customers.forEach((b) => {
        list.push({
          type: 'Brides',
          id: `bride-${b.id}`,
          label: b.name,
          sub: `Wedding: ${b.wedding_date || 'TBD'} · ${b.status}`,
          icon: Users,
          customerObj: { id: b.id, name: b.name, profilePhotoUrl: b.profile_photo_url },
          action: () => {
            onNavigate('customers', { brideId: b.id });
            onClose();
          },
        });
      });
    }

    if (canAccessView(role, 'inventory', profile?.id) && resolveFeatureAvailability('inventory.catalogs').effective) {
      searchResults.gowns.forEach((g) => {
        list.push({
          type: 'Inventory',
          id: `gown-${g.id}`,
          label: g.name,
          sub: `${g.designer} · SKU ${g.sku}`,
          icon: Shirt,
          action: () => {
            onNavigate('inventory', { gownId: g.id });
            onClose();
          },
        });
      });
    }

    if (canAccessView(role, 'leads', profile?.id) && resolveFeatureAvailability('growth.leads').effective) {
      searchResults.leads.forEach((l) => {
        list.push({
          type: 'Leads',
          id: `lead-${l.id}`,
          label: l.name,
          sub: `Stage: ${l.stage} · Source: ${l.source}`,
          icon: Sparkles,
          action: () => {
            onNavigate('leads', { leadId: l.id });
            onClose();
          },
        });
      });
    }

    if (canAccessView(role, 'contracts', profile?.id) && resolveFeatureAvailability('sales.contracts').effective) {
      searchResults.contracts.forEach((c) => {
        list.push({
          type: 'Contracts',
          id: `contract-${c.id}`,
          label: `Contract for ${c.customer}`,
          sub: `Status: ${c.status} · Total: $${c.amount_cents ? (c.amount_cents / 100).toFixed(2) : '0.00'}`,
          icon: FileSignature,
          action: () => {
            onNavigate('contracts', { contractId: c.id });
            onClose();
          },
        });
      });
    }

    if (canAccessView(role, 'invoices', profile?.id) && resolveFeatureAvailability('sales.core').effective) {
      searchResults.invoices.forEach((inv) => {
        list.push({
          type: 'Invoices',
          id: `invoice-${inv.id}`,
          label: `${inv.id} - ${inv.customer}`,
          sub: `Status: ${inv.status} • Amount: $${(inv.amount_cents / 100).toFixed(2)}`,
          icon: Receipt,
          action: () => {
            onNavigate('invoices', { invoiceId: inv.id });
            onClose();
          },
        });
      });
    }

    if (canAccessView(role, 'purchases', profile?.id) && resolveFeatureAvailability('inventory.purchasing').effective) {
      searchResults.purchase_orders.forEach((po) => {
        list.push({
          type: 'Purchase Orders',
          id: `po-${po.id}`,
          label: `PO ${po.id} - ${po.vendor}`,
          sub: `Status: ${po.status} • For: ${po.customer_for || 'Stock'}`,
          icon: Truck,
          action: () => {
            onNavigate('purchases', { poId: po.id });
            onClose();
          },
        });
      });
    }

    return list;
  }, [
    featureResults,
    navResults,
    searchResults,
    role,
    profile?.id,
    resolveFeatureAvailability,
    onNavigate,
    onClose,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (allResults.length > 0 ? (prev + 1) % allResults.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (allResults.length > 0 ? (prev - 1 + allResults.length) % allResults.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        allResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-stone-900/60 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-stone-900/10 animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center border-b border-stone-200 px-4 py-3.5">
          <Search className="h-5 w-5 text-stone-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brides, gowns, contracts, invoices, purchase orders, or commands..."
            className="flex-1 bg-transparent text-sm text-stone-900 placeholder-stone-400 focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-500 mr-2">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {allResults.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-stone-600">No matching records or commands found</p>
              <p className="text-xs text-stone-400 mt-1">Try searching for a bride name, gown style, invoice #, or view key.</p>
            </div>
          ) : (
            allResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                    isSelected ? 'bg-brand-soft text-brand-secondary font-medium' : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.customerObj ? (
                      <BridalIdentity customer={item.customerObj} size="sm" />
                    ) : (
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          isSelected ? 'bg-brand-primary text-white' : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-stone-900">{item.label}</span>
                        <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider bg-stone-100 px-1.5 py-0.5 rounded">
                          {item.type}
                        </span>
                      </div>
                      {item.sub && <p className="text-xs text-stone-500 truncate">{item.sub}</p>}
                    </div>
                  </div>
                  <ArrowRight className={`h-4 w-4 ml-2 transition-transform ${isSelected ? 'text-brand-primary translate-x-0.5' : 'text-stone-300'}`} />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/80 px-4 py-2 text-[11px] text-stone-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border bg-white px-1 font-sans shadow-2xs">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="rounded border bg-white px-1 font-sans shadow-2xs">↵</kbd> Select
            </span>
          </div>
          <span>Permission & Location Scoped</span>
        </div>
      </div>
    </div>
  );
}
