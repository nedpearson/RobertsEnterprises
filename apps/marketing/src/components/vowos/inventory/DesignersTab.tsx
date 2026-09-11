import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useVowosData } from '@/contexts/VowosDataContext';
import RosterTab from '../shared/RosterTab';

interface DesignerRow {
  id: string;
  name: string;
  gownCount: number;
  stock: number;
}

export function DesignersTab() {
  const [dbDesigners, setDbDesigners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { gowns } = useVowosData();

  useEffect(() => {
    async function loadDesigners() {
      try {
        const { data, error } = await supabase.from('designers').select('*').order('name');
        if (!error && data && data.length > 0) {
          setDbDesigners(data);
        } else {
          // Fallback to extracting from gowns
          const designerMap = new Map<string, any>();
          gowns.forEach(g => {
            const name = g.designer?.trim();
            if (!name) return;
            if (!designerMap.has(name)) {
              designerMap.set(name, { id: name, name });
            }
          });
          setDbDesigners(Array.from(designerMap.values()));
        }
      } catch (err) {
        console.error('Exception loading designers:', err);
        // Fallback to extracting from gowns
        const designerMap = new Map<string, any>();
        gowns.forEach(g => {
          const name = g.designer?.trim();
          if (!name) return;
          if (!designerMap.has(name)) {
            designerMap.set(name, { id: name, name });
          }
        });
        setDbDesigners(Array.from(designerMap.values()));
      } finally {
        setLoading(false);
      }
    }
    loadDesigners();
  }, [gowns]);

  const rows: DesignerRow[] = dbDesigners.map((d) => {
    const matchingGowns = gowns.filter(
      (g) => g.designer && d.name && g.designer.toLowerCase() === d.name.toLowerCase()
    );
    const gownCount = matchingGowns.length;
    const stock = matchingGowns.reduce((sum, g) => sum + (g.stock || 0), 0);
    return {
      id: d.id || d.name,
      name: d.name || 'Unknown',
      gownCount,
      stock,
    };
  });

  return (
    <RosterTab<DesignerRow>
      title="Designers"
      description="Designers represented in your catalog and current inventory levels."
      data={rows}
      primaryKey={(d) => d.id}
      searchPredicate={(d, term) => d.name.toLowerCase().includes(term)}
      emptyLabel={loading ? "Loading designers..." : "No designers found"}
      columns={[
        { header: 'Designer', render: (d) => <span className="font-bold text-stone-900">{d.name}</span> },
        { header: 'Catalog Styles', render: (d) => d.gownCount.toString() },
        { header: 'Total Units in Stock', render: (d) => d.stock.toString() },
      ]}
    />
  );
}
