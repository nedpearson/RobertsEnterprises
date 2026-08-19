import React from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import { VowosDataProvider } from '@/contexts/VowosDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/lib/demo/demoContext';
import { Navigate } from 'react-router-dom';

const Index: React.FC = () => {
  const { user, tenant, loading, session } = useAuth();
  const { isDemoMode } = useDemo();

  const isProfileLoading = !!session && !tenant;

  // The public live demo app is intentionally anonymous. Its authorization is
  // the isolated demo data plane, not a staff session. Real tenants retain the
  // normal authentication and active-organization requirements below.
  if (loading || isProfileLoading) {
    if (!isDemoMode) return null;
  }

  if (!isDemoMode && !user) {
    return <Navigate to="/login" replace />;
  }



  return (
    <AppProvider>
      <VowosDataProvider>
        <AppLayout />
      </VowosDataProvider>
    </AppProvider>
  );
};

export default Index;
