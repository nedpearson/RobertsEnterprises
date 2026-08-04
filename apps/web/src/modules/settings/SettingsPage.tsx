import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { SettingsModule } from '../../SettingsModule';
import { Spinner } from '../../design-system/Spinner';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<any | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/api/system/settings');
      setAdminData(res);
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <SettingsModule
        adminData={adminData}
        onRefresh={fetchSettings}
        API_BASE={API_BASE}
      />
    </div>
  );
}
