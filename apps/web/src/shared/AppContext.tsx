import { createContext, useContext } from 'react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api';

export { API_BASE };

export interface CurrentUser {
  id: number;
  name: string;
  role: string;
  email?: string;
}

export interface AppContextValue {
  API_BASE: string;
  currentUser: CurrentUser;
  activeBrand: 'ido' | 'proper';
  activeLocation: string;
  setActiveBrand: (b: 'ido' | 'proper') => void;
  setActiveLocation: (l: string) => void;
  // data
  customers: any[];
  leads: any[];
  appointments: any[];
  invoices: any[];
  purchases: any[];
  pickups: any[];
  inventory: any[];
  adminData: any;
  opsSummary: any;
  aiInsights: any[];
  // pagination
  customerPage: number; customerPages: number;
  invoicePage: number;  invoicePages: number;
  inventoryPage: number; inventoryPages: number;
  setCustomerPage: (p: number) => void;
  setInvoicePage:  (p: number) => void;
  setInventoryPage:(p: number) => void;
  // actions
  fetchData: (opts?: any) => void;
  onOpenPOModal:   () => void;
  onOpenApptModal: () => void;
  // pickup action
  handleMarkReady: (id: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export const AppProvider = AppContext.Provider;
