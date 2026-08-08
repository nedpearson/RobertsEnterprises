import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { getStoredDesktopMode, setStoredDesktopMode } from '@/lib/navigation/userPreferences';

interface DeviceModeContextValue {
  isDesktopModeOverride: boolean;
  setDesktopModeOverride: (val: boolean) => void;
}

const DeviceModeContext = createContext<DeviceModeContextValue | undefined>(undefined);

export function DeviceModeProvider({ children }: { children: ReactNode }) {
  const [isDesktopModeOverride, setIsDesktopModeOverride] = useState(false);

  useEffect(() => {
    setIsDesktopModeOverride(getStoredDesktopMode());
  }, []);

  const setDesktopModeOverride = (val: boolean) => {
    setIsDesktopModeOverride(val);
    setStoredDesktopMode(val);
  };

  return (
    <DeviceModeContext.Provider value={{ isDesktopModeOverride, setDesktopModeOverride }}>
      {children}
    </DeviceModeContext.Provider>
  );
}

export function useDeviceMode() {
  const context = useContext(DeviceModeContext);
  if (context === undefined) {
    throw new Error('useDeviceMode must be used within a DeviceModeProvider');
  }
  return context;
}
