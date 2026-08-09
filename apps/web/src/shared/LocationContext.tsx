import { createContext, useContext, useState, type ReactNode } from 'react';

// ─── Location Context ───

export interface BoutiqueLocation {
  id: number;
  name: string;
  brand: string;
  city: string;
  is_demo?: boolean;
}

interface LocationContextValue {
  locations: BoutiqueLocation[];
  activeLocation: BoutiqueLocation | null;
  setActiveLocation: (loc: BoutiqueLocation | null) => void;
  setLocations: (locs: BoutiqueLocation[]) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<BoutiqueLocation[]>([]);
  const [activeLocation, setActiveLocation] = useState<BoutiqueLocation | null>(null);

  return (
    <LocationContext.Provider value={{ locations, activeLocation, setActiveLocation, setLocations }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
