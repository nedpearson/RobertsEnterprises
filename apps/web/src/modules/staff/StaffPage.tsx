import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card } from '../../design-system/Card';
import { Spinner } from '../../design-system/Spinner';
import { PageHeader } from '../../design-system/PageHeader';
import { DataTable } from '../../design-system/DataTable';
import { StatusBadge } from '../../design-system/StatusBadge';

export default function StaffPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/api/payroll/staff');
      setUsers(res.staff || []);
    } catch (err) {
      console.error('Failed to load staff roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Team Roster"
        subtitle="Manage employee access, roles, and boutique assignments"
      />

      <Card>
        <DataTable
          data={users}
          keyExtractor={(u: any) => String(u.id)}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (u: any) => `${u.first_name} ${u.last_name}`,
            },
            {
              key: 'email',
              header: 'Email',
            },
            {
              key: 'role',
              header: 'Role',
              render: (u: any) => (
                <span className="font-semibold uppercase text-xs tracking-wider">
                  {u.role}
                </span>
              ),
            },
            {
              key: 'wage',
              header: 'Hourly Wage',
              render: (u: any) => `$${Number(u.hourly_wage || 0).toFixed(2)}/hr`,
            },
            {
              key: 'status',
              header: 'Status',
              render: (u: any) => (
                <StatusBadge 
                  status={u.clocked_in ? 'success' : 'neutral'} 
                  label={u.clocked_in ? 'Clocked In' : 'Off'} 
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
