
import React from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import { VowosDataProvider } from '@/contexts/VowosDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Index: React.FC = () => {
  const { user, tenant, loading } = useAuth();

  if (loading) return null;

  if (user && (!tenant || tenant.status !== 'ACTIVE')) {
    return <Navigate to="/onboarding" replace />;
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
