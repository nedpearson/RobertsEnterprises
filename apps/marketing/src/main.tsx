import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initTenantConfig } from './lib/supabase';

// Safely boot VowOS Data Plane with fallback to prevent blank screen errors
initTenantConfig().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
