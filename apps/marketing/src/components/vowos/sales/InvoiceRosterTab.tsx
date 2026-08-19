import React from 'react';
import { Invoice, formatCents, formatDate } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import RosterTab from '../shared/RosterTab';
import { StatusBadge } from '@/components/vowos/ui';

interface InvoiceRosterTabProps {
  title: string;
  description: string;
  filterFn?: (i: Invoice) => boolean;
  emptyLabel: string;
  onSelect: (i: Invoice) => void;
}

export function InvoiceRosterTab({ title, description, filterFn, emptyLabel, onSelect }: InvoiceRosterTabProps) {
  const { invoices, brides } = useVowosData();
  
  const getCustomerName = (customerId: string) => {
    const bride = brides.find((b) => b.id === customerId);
    return bride ? bride.name : 'Walk-in Customer';
  };

  const data = filterFn ? invoices.filter(filterFn) : invoices;

  return (
    <RosterTab<Invoice>
      title={title}
      description={description}
      data={data}
      primaryKey={(i) => i.id}
      searchPredicate={(i, term) => 
        getCustomerName(i.customer).toLowerCase().includes(term) || 
        i.id.toLowerCase().includes(term) ||
        i.description.toLowerCase().includes(term)
      }
      onRowClick={onSelect}
      emptyLabel={emptyLabel}
      columns={[
        { header: 'Invoice ID', render: (i) => i.id },
        { header: 'Customer', render: (i) => <span className="font-bold text-stone-900">{getCustomerName(i.customer)}</span> },
        { header: 'Description', render: (i) => i.description },
        { header: 'Amount', render: (i) => formatCents(i.amountCents) },
        { header: 'Balance', render: (i) => {
            const balance = i.amountCents - i.paidCents;
            return balance > 0 ? <span className="font-medium text-amber-600">{formatCents(balance)}</span> : <span className="text-stone-400">$0.00</span>;
        } },
        { header: 'Due Date', render: (i) => formatDate(i.dueDate) },
        { header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
      ]}
    />
  );
}
