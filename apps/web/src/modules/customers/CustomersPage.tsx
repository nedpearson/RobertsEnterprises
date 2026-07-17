import { useState } from 'react';
import { useApp } from '../../shared/AppContext';
import { EmptyState, PageHeader, StatusBadge } from '../../design-system';

function CustomerDetail({ customer, onBack, onTriggerPO }: { customer: any; onBack: () => void; onTriggerPO: () => void }) {
  return (
    <div className="dashboard-scroll">
      <PageHeader
        title={`${customer.first_name} ${customer.last_name}`}
        description={`${customer.email}${customer.phone ? ' · ' + customer.phone : ''}`}
        breadcrumb={['Customers', `${customer.first_name} ${customer.last_name}`]}
        actions={
          <>
            <button className="btn btn-outline" onClick={onBack}>← Back</button>
            <button className="btn btn-primary" onClick={onTriggerPO}>Generate Order</button>
          </>
        }
      />

      <div style={{ padding: 32, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        {/* Info panel */}
        <div style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid var(--border)', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600 }}>Customer Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</div>
              <div style={{ marginTop: 2 }}>{customer.email || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Phone</div>
              <div style={{ marginTop: 2 }}>{customer.phone || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</div>
              <div style={{ marginTop: 4 }}><StatusBadge status={customer.status || 'active'} /></div>
            </div>
            {customer.wedding_date && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Wedding Date</div>
                <div style={{ marginTop: 2 }}>{new Date(customer.wedding_date).toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: 15, fontWeight: 600 }}>Customer Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Profile Viewed</div>
              <div style={{ fontWeight: 500, marginTop: 4 }}>Record accessed from customer list.</div>
            </div>
            {customer.created_at && (
              <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Record Created</div>
                <div style={{ fontWeight: 500, marginTop: 4 }}>{new Date(customer.created_at).toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomersPage({ onTriggerPO }: { onTriggerPO: () => void }) {
  const { customers, customerPage, customerPages, setCustomerPage, fetchData } = useApp();
  const [selected, setSelected] = useState<any>(null);

  if (selected) {
    return <CustomerDetail customer={selected} onBack={() => setSelected(null)} onTriggerPO={onTriggerPO} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <PageHeader title="Customers" description="Active brides and customer records" />

      <div className="dashboard-scroll">
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c.id} className="hover-row" onClick={() => setSelected(c)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>{c.first_name} {c.last_name}</td>
                  <td>{c.email}</td>
                  <td>{c.phone || '—'}</td>
                  <td><StatusBadge status={c.status || 'active'} size="sm" /></td>
                  <td>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '5px 12px', fontSize: 12 }}
                      onClick={e => { e.stopPropagation(); setSelected(c); }}
                    >
                      View 360
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon="👰" title="No customers yet" description="Add your first customer via the calendar booking flow." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {customerPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', justifyContent: 'flex-end' }}>
            <button className="btn" style={{ padding: '4px 12px' }} disabled={customerPage <= 1} onClick={() => { setCustomerPage(customerPage - 1); fetchData({ customers: customerPage - 1 }); }}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {customerPage} of {customerPages}</span>
            <button className="btn" style={{ padding: '4px 12px' }} disabled={customerPage >= customerPages} onClick={() => { setCustomerPage(customerPage + 1); fetchData({ customers: customerPage + 1 }); }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
