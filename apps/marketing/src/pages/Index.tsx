
import React from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import { VowosDataProvider } from '@/contexts/VowosDataContext';

const Index: React.FC = () => {
  return (
    <AppProvider>
      <VowosDataProvider>
        <AppLayout />
      </VowosDataProvider>
    </AppProvider>
  );
};

export default Index;
