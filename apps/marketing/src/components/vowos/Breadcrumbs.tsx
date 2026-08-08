import { ChevronRight, Home } from 'lucide-react';
import { NAVIGATION_ITEMS, NAVIGATION_SECTIONS, ViewKey } from '@/lib/navigation/navigationRegistry';

interface BreadcrumbsProps {
  view: ViewKey;
  subTitle?: string;
  subItem?: string;
  onNavigate: (view: ViewKey) => void;
}

export default function Breadcrumbs({ view, subTitle, subItem, onNavigate }: BreadcrumbsProps) {
  const currentNav = NAVIGATION_ITEMS.find((item) => item.id === view);
  if (!currentNav) return null;

  const currentSection = NAVIGATION_SECTIONS.find((sec) => sec.id === currentNav.section);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-stone-500 mb-4">
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-1 hover:text-stone-900 transition-colors focus:outline-none focus:ring-1 focus:ring-rose-500 rounded px-1"
        title="Today Operating Command Center"
      >
        <Home className="h-3.5 w-3.5 text-stone-400" />
        <span className="hidden sm:inline">VowOS</span>
      </button>

      {currentSection && currentSection.id !== 'today' && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-stone-300 flex-shrink-0" />
          <span className="font-medium text-stone-400 uppercase tracking-wider text-[10px]">
            {currentSection.label}
          </span>
        </>
      )}

      <ChevronRight className="h-3.5 w-3.5 text-stone-300 flex-shrink-0" />
      <button
        onClick={() => onNavigate(view)}
        className={`font-medium transition-colors hover:text-stone-900 focus:outline-none rounded px-1 ${
          !subItem && !subTitle ? 'text-stone-900 font-semibold' : 'text-stone-600'
        }`}
      >
        {currentNav.label}
      </button>

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
          <span className="font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[11px]">
            {subItem}
          </span>
        </>
      )}
    </nav>
  );
}
