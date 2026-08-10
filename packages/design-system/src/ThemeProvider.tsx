import React, { createContext, useContext, useEffect, useState } from 'react';

export interface TenantBrandConfig {
  companyName: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoLight?: string;
  logoDark?: string;
  primaryActionColor?: string;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTenantConfig?: TenantBrandConfig;
  forceVowosMaster?: boolean;
}

const ThemeContext = createContext<{
  tenantConfig: TenantBrandConfig | null;
  setTenantConfig: (config: TenantBrandConfig) => void;
}>({
  tenantConfig: null,
  setTenantConfig: () => null,
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children, defaultTenantConfig = undefined, forceVowosMaster = false }: ThemeProviderProps) {
  const [tenantConfig, setTenantConfig] = useState<TenantBrandConfig | null>(defaultTenantConfig || null);

  useEffect(() => {
    if (forceVowosMaster) {
      document.documentElement.style.removeProperty('--brand-primary');
      document.documentElement.style.removeProperty('--brand-primary-action');
      document.documentElement.style.removeProperty('--brand-primary-hover');
      return;
    }

    if (tenantConfig?.primaryColor) {
      document.documentElement.style.setProperty('--brand-primary', tenantConfig.primaryColor);
    }
    if (tenantConfig?.primaryActionColor) {
      document.documentElement.style.setProperty('--brand-primary-action', tenantConfig.primaryActionColor);
      document.documentElement.style.setProperty('--brand-primary-hover', tenantConfig.primaryActionColor);
    } else if (tenantConfig?.primaryColor) {
      document.documentElement.style.setProperty('--brand-primary-action', tenantConfig.primaryColor);
      document.documentElement.style.setProperty('--brand-primary-hover', tenantConfig.primaryColor);
    }
    
    // Accessibility overrides can be calculated here if required
  }, [tenantConfig, forceVowosMaster]);

  return (
    <ThemeContext.Provider value={{ tenantConfig, setTenantConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}
