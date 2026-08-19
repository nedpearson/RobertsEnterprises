import React from 'react';
import { PurchaseOrder, formatCents, formatDate } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import RosterTab from '../shared/RosterTab';
import { StatusBadge } from '@/components/vowos/ui';

interface PurchaseOrderRosterTabProps {
  title: string;
  description: string;
  filterFn?: (po: PurchaseOrder) => boolean;
  emptyLabel: string;
  onSelect?: (po: PurchaseOrder) => void;
}

export function PurchaseOrderRosterTab({ title, description, filterFn, emptyLabel, onSelect }: PurchaseOrderRosterTabProps) {
  const { purchaseOrders, brides } = useVowosData();
  
  const getCustomerName = (customerId?: string) => {
    if (!customerId) return '—';
    const bride = brides.find((b) => b.id === customerId);
    return bride ? bride.name : customerId;
  };

  const data = filterFn ? purchaseOrders.filter(filterFn) : purchaseOrders;

  return (
    <RosterTab<PurchaseOrder>
      title={title}
      description={description}
      data={data}
      primaryKey={(po) => po.id}
      searchPredicate={(po, term) => 
        po.id.toLowerCase().includes(term) || 
        po.vendor.toLowerCase().includes(term) ||
        (po.assignedCustomer && getCustomerName(po.assignedCustomer).toLowerCase().includes(term))
      }
      onRowClick={onSelect}
      emptyLabel={emptyLabel}
      columns={[
        { header: 'PO ID', render: (po) => po.id },
        { header: 'Vendor', render: (po) => <span className="font-bold text-stone-900">{po.vendor}</span> },
        { header: 'Items', render: (po) => po.items },
        { header: 'Amount', render: (po) => formatCents(po.amountCents) },
        { header: 'Ordered', render: (po) => formatDate(po.ordered) },
        { header: 'Delivery', render: (po) => formatDate(po.expectedDelivery) },
        { header: 'Special Order For', render: (po) => po.assignedCustomer ? <span className="font-medium text-indigo-600">{getCustomerName(po.assignedCustomer)}</span> : <span className="text-stone-400">—</span> },
        { header: 'Status', render: (po) => <StatusBadge status={po.status} /> },
        { header: 'Location', render: (po) => po.location },
      ]}
    />
  );
}
