import { useEffect, useState, useMemo } from 'react';
import { AlertCircle, FileCheck, RefreshCcw, BellElectric, ArrowRight, Loader2, X, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVowosData } from '@/contexts/VowosDataContext';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import { fetchActions, ActionCenterRecord, updateActionStatus } from '@/lib/services/actionCenterService';
import { useDemo } from '@/lib/demo/demoContext';

type FilterType = 'All' | 'Urgent' | 'Approvals' | 'Due Today' | 'Follow-ups' | 'Exceptions';

export default function NeedsAttention() {
  const { session, profile, tenant } = useAuth();
  const { activeLocation } = useVowosData();
  const routeCtx = useApplicationRoute() as any;
  const navigateToPath = routeCtx.navigateToPath || routeCtx.navigateToView;
  const { isDemoMode } = useDemo();
  
  console.log('NeedsAttention rendering:', { session: !!session, isDemoMode });

  const [actions, setActions] = useState<ActionCenterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<FilterType>('All');

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!session && !isDemoMode) return;
      
      const businessId = isDemoMode ? 'demo-business-id-001' : tenant?.id;
      if (!businessId) {
        if (mounted) {
          setActions([]);
          setLoading(false);
        }
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const data = await fetchActions(businessId, activeLocation);
        if (mounted) setActions(data);
      } catch (err: any) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [session, isDemoMode, tenant?.id, activeLocation]);

  const handleActionClick = (action: ActionCenterRecord) => {
    navigateToPath(action.deep_link);
  };

  const handleDismiss = async (action: ActionCenterRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    // Simulate dismiss logic for demo, usually this would prompt for a reason
    const success = await updateActionStatus(action.id, 'Dismissed', { reason: 'Dismissed from Today view', dismissed_by: profile?.id });
    if (success) {
      setActions(prev => prev.filter(a => a.id !== action.id));
    }
  };

  // Filter conditions
  const urgentActions = actions.filter(a => a.priority === 'Critical' || a.priority === 'High');
  const approvalActions = actions.filter(a => a.requires_approval || a.action_type.includes('approval'));
  const followUpActions = actions.filter(a => a.action_type.includes('follow') || a.action_type.includes('response'));
  const exceptionActions = actions.filter(a => !urgentActions.includes(a) && !approvalActions.includes(a) && !followUpActions.includes(a) && (a.action_type.includes('exception') || a.action_type.includes('discrepancy')));
  const dueTodayActions = actions.filter(a => {
    if (!a.due_at) return false;
    const due = new Date(a.due_at);
    const today = new Date();
    return due.toDateString() === today.toDateString();
  });

  const filteredActions = useMemo(() => {
    switch (filter) {
      case 'Urgent': return urgentActions;
      case 'Approvals': return approvalActions;
      case 'Follow-ups': return followUpActions;
      case 'Exceptions': return exceptionActions;
      case 'Due Today': return dueTodayActions;
      default: return actions;
    }
  }, [filter, actions, urgentActions, approvalActions, followUpActions, exceptionActions, dueTodayActions]);

  if (!session && !isDemoMode) return null;

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white shadow-sm flex flex-col h-full max-h-[500px]">
      <div className="p-4 sm:p-6 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg text-stone-900 flex items-center gap-2">
            <BellElectric className="h-5 w-5 text-brand-primary" />
            Needs Attention
          </h2>
          <p className="text-xs text-stone-500 mt-1">Operational exceptions requiring your input</p>
        </div>
        <div className="hidden md:flex gap-2 text-xs">
          {(['All', 'Urgent', 'Due Today', 'Approvals'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${filter === f ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-stone-50/50">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-stone-300 mb-2" />
            <p className="text-xs text-stone-500">Scanning operations...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <AlertCircle className="h-10 w-10 text-brand-primary mb-3" />
            <h3 className="text-sm font-semibold text-stone-900">Unable to load attention items</h3>
            <p className="mt-1 text-xs text-stone-500">The action service could not complete the request. Please check your connection or system health.</p>
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <FileCheck className="h-10 w-10 text-emerald-400 mb-3" />
            <h3 className="text-sm font-semibold text-stone-900">You're caught up</h3>
            <p className="mt-1 text-xs text-stone-500">No urgent operational items require your attention right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
            {filteredActions.map(action => {
              const isUrgent = action.priority === 'Critical' || action.priority === 'High';
              return (
                <div
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className={`group relative rounded-xl border p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${isUrgent ? 'border-border-subtle bg-brand-soft/30 hover:border-rose-300' : 'border-stone-200 bg-white hover:border-stone-300'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isUrgent ? 'bg-brand-soft text-brand-primary-hover' : 'bg-stone-100 text-stone-600'}`}>
                        {action.priority}
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">{action.source_module}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {action.due_at && (
                        <span className="text-[10px] text-stone-400 hidden sm:inline-block">
                          Due {new Date(action.due_at).toLocaleDateString()}
                        </span>
                      )}
                      <button 
                        onClick={(e) => handleDismiss(action, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded"
                        title="Dismiss"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-semibold text-stone-900 text-sm leading-tight pr-6">{action.title}</h4>
                  {action.description && (
                    <p className="mt-1 text-xs text-stone-500 line-clamp-1">{action.description}</p>
                  )}
                  <div className="mt-3 flex">
                    <div className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hover px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors w-full sm:w-auto">
                      Fix Now <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {actions.length > 0 && !error && (
        <div className="p-3 border-t border-stone-100 bg-white rounded-b-2xl">
          <button 
            onClick={() => setFilter('All')}
            className="w-full text-center text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors py-1"
          >
            {filter !== 'All' ? 'View All Attention Items' : `${actions.length} Total Open Items`}
          </button>
        </div>
      )}
    </div>
  );
}
