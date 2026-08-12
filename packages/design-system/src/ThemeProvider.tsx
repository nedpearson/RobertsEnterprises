import React, { createContext, useContext, useEffect, useState } from 'react';

export interface TenantBrandKit {
  businessName?: string;
  logoUrl?: string;
  primaryAccent?: string; // hex color, will be validated
  secondaryAccent?: string; // hex color, will be validated  
  heroImageUrl?: string;
}

export interface TenantBrandConfig {
  companyName: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoLight?: string;
  logoDark?: string;
  primaryActionColor?: string;
}

function getLuminance(hex: string): number {
  try {
    const rgb = hex.replace('#', '').match(/.{2}/g)!.map(x => {
      const v = parseInt(x, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  } catch {
    return 0.5;
  }
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function ensureContrast(color: string, background: string, minRatio = 4.5): string {
  if (getContrastRatio(color, background) >= minRatio) return color;
  const bgLuminance = getLuminance(background);
  return bgLuminance < 0.5 ? '#F8F5F1' : '#1D1A20';
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTenantConfig?: TenantBrandConfig;
  brandKit?: TenantBrandKit;
  forceVowosMaster?: boolean;
}

const ThemeContext = createContext<{
  tenantConfig: TenantBrandConfig | null;
  setTenantConfig: (config: TenantBrandConfig) => void;
  brandKit: TenantBrandKit | null;
}>({
  tenantConfig: null,
  setTenantConfig: () => null,
  brandKit: null,
});

export const useTheme = () => useContext(ThemeContext);

export const useTenantBrandKit = () => {
  const context = useContext(ThemeContext);
  return context.brandKit;
};

export function ThemeProvider({ children, defaultTenantConfig = undefined, brandKit = undefined, forceVowosMaster = false }: ThemeProviderProps) {
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

    if (brandKit?.primaryAccent) {
      const surfaceCanvas = '#F8F5F1';
      const validPrimary = ensureContrast(brandKit.primaryAccent, surfaceCanvas);
      document.documentElement.style.setProperty('--brand-primary', validPrimary);
    }
    if (brandKit?.secondaryAccent) {
      const surfaceCanvas = '#F8F5F1';
      const validSecondary = ensureContrast(brandKit.secondaryAccent, surfaceCanvas);
      document.documentElement.style.setProperty('--brand-secondary', validSecondary);
    }
  }, [tenantConfig, brandKit, forceVowosMaster]);

  return (
    <ThemeContext.Provider value={{ tenantConfig, setTenantConfig, brandKit: brandKit || null }}>
      {children}
    </ThemeContext.Provider>
  );
}
