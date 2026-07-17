import { useToast, EmptyState, PageHeader } from '../../design-system';
import { API_BASE } from '../../shared/AppContext';

export function EmployeesPage({ users, currentUser }: { users: any[]; currentUser: any }) {
  const { toast } = useToast();

  const handleClockIn = async () => {
    try {
      const token = localStorage.getItem('vowos_token') || '';
      const res = await fetch(`${API_BASE}/payroll/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: currentUser?.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast('Shift started — timecard punched.', 'success');
      } else {
        toast(data.error || 'Clock-in failed.', 'error');
      }
    } catch (e: any) {
      toast('Network error: ' + e.message, 'error');
    }
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Employee Hub"
        description="Shift management and timecard validation"
        actions={
          <button className="btn btn-primary" onClick={handleClockIn} style={{ fontSize: 15, padding: '10px 24px' }}>
            ◎ Clock In
          </button>
        }
      />
      <div className="dashboard-scroll" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 24 }}>Weekly Schedule</h3>
            {currentUser?.role === 'owner' && users?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.map((u: any) => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <b>{u.name}</b>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.role.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="📅" title="No schedule data" description="Employee schedules will appear here when configured." />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3 style={{ marginTop: 0 }}>Quick Stats</h3>
              <EmptyState icon="📊" title="Live metrics" description="Clock in to start tracking your shift metrics." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
