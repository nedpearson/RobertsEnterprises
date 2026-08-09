import { NavigationSectionId, ViewKey } from './navigationRegistry';

const STORAGE_KEYS = {
  COMPACT_SIDEBAR: 'vowos_sidebar_compact',
  EXPANDED_SECTIONS: 'vowos_sidebar_expanded_sections',
  FAVORITES: 'vowos_user_favorites',
  RECENTS: 'vowos_user_recents',
  DESKTOP_MODE: 'vowos_desktop_mode_override',
};

export interface RecentDestination {
  key: ViewKey;
  label: string;
  path: string;
  timestamp: number;
}

export function getStoredDesktopMode(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEYS.DESKTOP_MODE) === 'true';
  } catch {
    return false;
  }
}

export function setStoredDesktopMode(desktop: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.DESKTOP_MODE, desktop ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to store desktop mode state:', e);
  }
}

export function getStoredCompactSidebar(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEYS.COMPACT_SIDEBAR) === 'true';
  } catch {
    return false;
  }
}

export function setStoredCompactSidebar(compact: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.COMPACT_SIDEBAR, compact ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to store sidebar compact state:', e);
  }
}

export function getStoredExpandedSections(): Record<NavigationSectionId, boolean> {
  const defaults: Record<NavigationSectionId, boolean> = {
    today: true,
    clients: true,
    gowns: true,
    finance: false,
    team: false,
    insights: false,
    admin: false,
    external: true,
  };
  if (typeof localStorage === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPANDED_SECTIONS);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function setStoredExpandedSections(sections: Record<NavigationSectionId, boolean>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.EXPANDED_SECTIONS, JSON.stringify(sections));
  } catch (e) {
    console.error('Failed to store expanded sections state:', e);
  }
}

export function getStoredFavorites(): ViewKey[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setStoredFavorites(favorites: ViewKey[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites.slice(0, 5)));
  } catch (e) {
    console.error('Failed to store favorites:', e);
  }
}

export function getStoredRecents(): RecentDestination[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addStoredRecent(key: ViewKey, label: string, path: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const recents = getStoredRecents();
    const filtered = recents.filter((r) => r.key !== key);
    const updated = [{ key, label, path, timestamp: Date.now() }, ...filtered].slice(0, 8);
    localStorage.setItem(STORAGE_KEYS.RECENTS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to store recent destination:', e);
  }
}
