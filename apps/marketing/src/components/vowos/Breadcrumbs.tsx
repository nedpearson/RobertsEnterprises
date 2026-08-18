import { ChevronRight, Home } from 'lucide-react';
import { WORKSPACES, WorkspaceId } from '@/lib/navigation/navigationRegistry';

interface BreadcrumbsProps {
  view: WorkspaceId;
  subTitle?: string;
  subItem?: string;
  onNavigate: (view: WorkspaceId) => void;
}

export default function Breadcrumbs({ view, subTitle, subItem, onNavigate }: BreadcrumbsProps) {
  const currentWorkspace = WORKSPACES.find((w) => w.id === view);
  if (!currentWorkspace) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-stone-500 mb-4">
      <button
        onClick={() => onNavigate('today')}
        className="flex items-center gap-1 hover:text-stone-900 transition-colors focus:outline-none focus:ring-1 focus:ring-focus-ring rounded px-1"
        title="Today Operating Command Center"
      >
        <Home className="h-3.5 w-3.5 text-stone-400" />
        <span className="hidden sm:inline">VowOS</span>
      </button>

      {currentWorkspace.id !== 'today' && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-stone-300 flex-shrink-0" />
          <button
            onClick={() => onNavigate(view)}
            className={`font-medium transition-colors hover:text-stone-900 focus:outline-none rounded px-1 ${
              !subItem && !subTitle ? 'text-stone-900 font-semibold' : 'text-stone-600'
            }`}
          >
            {currentWorkspace.sidebarLabel}
          </button>
        </>
      )}

      {subTitle && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-stone-300 flex-shrink-0" />
          <span className="font-medium text-stone-800 truncate max-w-[150px] sm:max-w-[250px]">
            {subTitle}
          </span>
        </>
      )}

      {subItem && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-stone-300 flex-shrink-0" />
          <span className="font-semibold text-brand-primary bg-brand-soft px-1.5 py-0.5 rounded text-[11px]">
            {subItem}
          </span>
        </>
      )}
    </nav>
  );
}
