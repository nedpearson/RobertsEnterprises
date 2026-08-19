import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Users, Sparkles, Shirt, FileSignature, Receipt, CalendarDays, ArrowRight, ShieldAlert } from 'lucide-react';
import { NAVIGATION_ITEMS, NavigationItem, ViewKey } from '@/lib/navigation/navigationRegistry';
import { FEATURE_REGISTRY } from '@/data/featureRegistry';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/lib/demo/demoContext';
import { useVowosData } from '@/contexts/VowosDataContext';
import { canAccessView } from '@/components/vowos/Sidebar';
import { fetchContracts, ContractRecord } from '@/lib/contractsAlterations';
import BridalIdentity from './BridalIdentity';
import { useModuleResolution } from '@/lib/modules/resolver';

interface CommandPaletteModalProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewKey, params?: Record<string, string>) => void;
}

export default function CommandPaletteModal({ open, onClose, onNavigate }: CommandPaletteModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { profile } = useAuth();
  const { isDemoMode, activePersona } = useDemo();
  const { resolveFeatureAvailability } = useModuleResolution();
  const role = isDemoMode ? activePersona.role : (profile?.role ?? null);
  const { brides = [], gowns = [], leads = [], appointments = [], invoices = [] } = useVowosData();
  const [contracts, setContracts] = useState<ContractRecord[]>([]);

  useEffect(() => {
    if (open) {
      fetchContracts().then(setContracts).catch(() => {});
    }
  }, [open]);

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
  }, [query]);

  // Compute matching items across navigation and domain entities
  
  const featureResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
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
        onNavigate(f.route.replace('/demo', '').substring(1) as ViewKey);
        onClose();
      }
    }));
  }, [query, onNavigate, onClose]);

  const navResults = useMemo(() => {
    if (!query.trim()) {
      return (NAVIGATION_ITEMS || [])
        .filter((item) => {
          if (item.external) return false;
          if (!canAccessView(role, item.id as ViewKey, profile?.id)) return false;
          if (item.featureSlug && !resolveFeatureAvailability(item.featureSlug).effective) return false;
          return true;
        })
        .slice(0, 5);
    }
    const q = query.toLowerCase();
    return (NAVIGATION_ITEMS || []).filter((item) => {
      if (item.external) return false;
      if (!canAccessView(role, item.id as ViewKey, profile?.id)) return false;
      if (item.featureSlug && !resolveFeatureAvailability(item.featureSlug).effective) return false;
      return (
        item.label.toLowerCase().includes(q) ||
        item.shortLabel?.toLowerCase().includes(q) ||
        item.searchKeywords.some((kw) => kw.includes(q))
      );
    });
  }, [query, role, profile?.id, resolveFeatureAvailability]);

  const brideResults = useMemo(() => {
    if (!query.trim() || !canAccessView(role, 'customers', profile?.id)) return [];
    const q = query.toLowerCase();
    return (brides || [])
      .filter((b) => b.name?.toLowerCase().includes(q) || b.email?.toLowerCase().includes(q) || b.phone?.includes(q))
      .slice(0, 4);
  }, [query, brides, role, profile?.id]);

  const gownResults = useMemo(() => {
    if (!query.trim() || !canAccessView(role, 'inventory', profile?.id) || !resolveFeatureAvailability('inventory.catalog').effective) return [];
    const q = query.toLowerCase();
    return (gowns || [])
      .filter((g) => g.name?.toLowerCase().includes(q) || g.designer?.toLowerCase().includes(q) || g.sku?.toLowerCase().includes(q))
      .slice(0, 4);
  }, [query, gowns, role, profile?.id, resolveFeatureAvailability]);

  const leadResults = useMemo(() => {
    if (!query.trim() || !canAccessView(role, 'leads', profile?.id) || !resolveFeatureAvailability('growth.leads').effective) return [];
    const q = query.toLowerCase();
    return (leads || [])
      .filter((l) => l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q))
      .slice(0, 3);
  }, [query, leads, role, profile?.id, resolveFeatureAvailability]);

  const contractResults = useMemo(() => {
    if (!query.trim() || !canAccessView(role, 'contracts', profile?.id) || !resolveFeatureAvailability('sales.contracts').effective) return [];
    const q = query.toLowerCase();
    return (contracts || [])
      .filter((c) => c.customer?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q))
      .slice(0, 3);
  }, [query, contracts, role, profile?.id, resolveFeatureAvailability]);

  const invoiceResults = useMemo(() => {
    if (!query.trim() || !canAccessView(role, 'invoices', profile?.id) || !resolveFeatureAvailability('sales.invoicing').effective) return [];
    const q = query.toLowerCase();
    return (invoices || [])
      .filter((inv) => inv.brideName?.toLowerCase().includes(q) || inv.invoiceNumber?.toLowerCase().includes(q))
      .slice(0, 3);
  }, [query, invoices, role, profile?.id, resolveFeatureAvailability]);

  // Combined selectable list for keyboard navigation
  const allResults = useMemo(() => {
    const list: { type: string; id: string; label: string; sub?: string; icon: any; action: () => void }[] = [];

    
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

    brideResults.forEach((b) => {
      list.push({
        type: 'Brides',
        id: `bride-${b.id}`,
        label: b.name,
        sub: `Wedding: ${b.weddingDate || 'TBD'} · ${b.status}`,
        icon: Users,
        customerObj: b,
        action: () => {
          onNavigate('customers', { brideId: b.id });
          onClose();
        },
      });
    });

    gownResults.forEach((g) => {
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

    leadResults.forEach((l) => {
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

    contractResults.forEach((c) => {
      list.push({
        type: 'Contracts',
        id: `contract-${c.id}`,
        label: `Contract for ${c.customer}`,
        sub: `Status: ${c.status} · Total: $${c.amountCents ? (c.amountCents / 100).toFixed(2) : '0.00'}`,
        icon: FileSignature,
        action: () => {
          onNavigate('contracts', { contractId: c.id });
          onClose();
        },
      });
    });

    invoiceResults.forEach((inv) => {
      list.push({
        type: 'Invoices',
        id: `invoice-${inv.id}`,
        label: `${inv.invoiceNumber} - ${inv.brideName}`,
        sub: `Status: ${inv.status} · Balance: $${(inv.balanceCents / 100).toFixed(2)}`,
        icon: Receipt,
        action: () => {
          onNavigate('invoices', { invoiceId: inv.id });
          onClose();
        },
      });
    });

    return list;
  }, [navResults, brideResults, gownResults, leadResults, contractResults, invoiceResults, onNavigate, onClose]);

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
            placeholder="Search brides, gowns, contracts, invoices, schedule, or commands..."
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
                    {(item as any).customerObj ? (
                      <BridalIdentity customer={(item as any).customerObj} size="sm" />
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
