import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useVowosData } from '@/contexts/VowosDataContext';
import RosterTab from '../shared/RosterTab';
import { formatCents } from '@/data/vowosData';

interface VendorRow {
  id: string;
  name: string;
  poCount: number;
  totalValue: number;
}

export function VendorsTab() {
  const [dbVendors, setDbVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { purchaseOrders } = useVowosData();

  useEffect(() => {
    async function loadVendors() {
      try {
        const { data, error } = await supabase.from('vendors').select('*').order('name');
        if (error) {
          console.error('Failed to load vendors:', error);
        } else if (data) {
          setDbVendors(data);
        }
      } catch (err) {
        console.error('Exception loading vendors:', err);
      } finally {
        setLoading(false);
      }
    }
    loadVendors();
  }, []);

  const rows: VendorRow[] = dbVendors.map((v) => {
    const matchingPOs = purchaseOrders.filter(
      (po) => po.vendor && v.name && po.vendor.toLowerCase() === v.name.toLowerCase()
    );
    const poCount = matchingPOs.length;
    const totalValue = matchingPOs.reduce((sum, po) => sum + (po.amountCents || 0), 0);
    return {
      id: v.id || v.name,
      name: v.name || 'Unknown',
      poCount,
      totalValue,
    };
  });

  return (
    <RosterTab<VendorRow>
      title="Vendors"
      description="Active vendors and total purchase order volume."
      data={rows}
      primaryKey={(v) => v.id}
      searchPredicate={(v, term) => v.name.toLowerCase().includes(term)}
      emptyLabel={loading ? "Loading vendors..." : "No vendors found"}
      columns={[
        { header: 'Vendor Name', render: (v) => <span className="font-bold text-stone-900">{v.name}</span> },
        { header: 'Purchase Orders', render: (v) => v.poCount.toString() },
        { header: 'Total Ordered Value', render: (v) => formatCents(v.totalValue) },
      ]}
    />
  );
}
