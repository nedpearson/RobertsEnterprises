import { EmptyState, PageHeader } from '../../design-system';

export function InventoryPage({ inventory, onInspectItem }: { inventory: any[]; onInspectItem: (item: any) => void }) {
  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Designer Catalog" description="Global inventory and style catalog" />
      <div className="dashboard-scroll">
        {inventory.length === 0 && <EmptyState icon="👗" title="No inventory seeded yet" />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {inventory.map((item: any) => (
            <div key={item.id} onClick={() => onInspectItem(item)} className="kpi-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{item.vendor_name}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{item.style_number}</div>
              <div style={{ fontSize: 14, marginTop: 2 }}>{item.category}</div>
              <div style={{ fontSize: 16, color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>${(item.base_price_cents / 100).toLocaleString()}</div>
              <hr style={{ margin: '14px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
              {item.variants?.map((v: any) => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Sz {v.size} — {v.color}</span>
                  <span style={{ color: v.stock_quantity > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{v.stock_quantity} in Vault</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
