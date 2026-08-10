
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initTenantConfig } from './lib/supabase'

initTenantConfig().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
}).catch(err => {
  document.getElementById("root")!.innerHTML = `<div style="padding: 20px; color: red;"><h1>Failed to load VowOS Data Plane</h1><p>${err.message}</p></div>`;
});
