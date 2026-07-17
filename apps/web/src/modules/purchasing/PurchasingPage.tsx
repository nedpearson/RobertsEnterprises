import { EmptyState, PageHeader, StatusBadge } from '../../design-system';

export function PurchasingPage({ purchases, onTriggerPO }: { purchases: any[]; onTriggerPO: () => void }) {
  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Purchasing Portal"
        description="Vendor purchase orders and order tracking"
        actions={<button className="btn btn-primary" onClick={onTriggerPO}>+ New Purchase Order</button>}
      />
      <div className="dashboard-scroll">
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th>PO Number</th><th>Vendor / Designer</th><th>Style Details</th><th>Expected Ship</th><th>Status</th></tr>
            </thead>
            <tbody>
              {purchases.map((p: any) => (
                <tr key={p.id} className="hover-row">
                  <td style={{ fontWeight: 600 }}>PO-{p.id}</td>
                  <td style={{ fontWeight: 600 }}>{p.vendor_name}</td>
                  <td>{p.style_number} (Sz {p.size})</td>
                  <td>{p.expected_ship_date || '—'}</td>
                  <td><StatusBadge status={p.status} size="sm" /></td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr><td colSpan={5}><EmptyState icon="📦" title="No active vendor orders" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
