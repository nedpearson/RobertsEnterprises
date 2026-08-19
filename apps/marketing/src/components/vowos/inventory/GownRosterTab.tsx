import React from 'react';
import { Gown, formatCents } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import RosterTab from '../shared/RosterTab';
import { StatusBadge } from '@/components/vowos/ui';

interface GownRosterTabProps {
  title: string;
  description: string;
  filterFn?: (g: Gown) => boolean;
  emptyLabel: string;
  onSelect?: (g: Gown) => void;
}

export function GownRosterTab({ title, description, filterFn, emptyLabel, onSelect }: GownRosterTabProps) {
  const { gowns } = useVowosData();
  
  const data = filterFn ? gowns.filter(filterFn) : gowns;

  return (
    <RosterTab<Gown>
      title={title}
      description={description}
      data={data}
      primaryKey={(g) => g.id}
      searchPredicate={(g, term) => 
        g.name.toLowerCase().includes(term) || 
        g.designer.toLowerCase().includes(term) ||
        g.style.toLowerCase().includes(term) ||
        g.sku.toLowerCase().includes(term)
      }
      onRowClick={onSelect}
      emptyLabel={emptyLabel}
      columns={[
        { header: 'Designer', render: (g) => <span className="font-bold text-stone-900">{g.designer}</span> },
        { header: 'Name', render: (g) => g.name },
        { header: 'Style / SKU', render: (g) => <div className="flex flex-col"><span>{g.style}</span><span className="text-xs text-stone-500">{g.sku}</span></div> },
        { header: 'Size/Color', render: (g) => `${g.size} / ${g.color}` },
        { header: 'Price', render: (g) => formatCents(g.priceCents) },
        { header: 'Stock', render: (g) => <span className={g.stock > 0 ? "font-bold text-emerald-600" : "text-rose-500"}>{g.stock}</span> },
        { header: 'Status', render: (g) => <StatusBadge status={g.status} /> },
        { header: 'Location', render: (g) => g.location },
      ]}
    />
  );
}
