import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import CommandPaletteModal from './CommandPaletteModal';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'demo-user', role: 'OWNER' },
    entitlementContext: null,
  }),
}));

vi.mock('@/contexts/VowosDataContext', () => ({
  useVowosData: () => ({
    brides: [],
    gowns: [],
    leads: [],
    appointments: [],
    invoices: [],
  }),
}));

vi.mock('@/components/vowos/Sidebar', () => ({
  canAccessView: () => true,
}));

vi.mock('@/lib/contractsAlterations', () => ({
  fetchContracts: async () => [],
}));

describe('CommandPaletteModal', () => {
  it('renders without throwing when entitlement context is absent', () => {
    expect(() =>
      renderToStaticMarkup(
        <CommandPaletteModal open={false} onClose={() => {}} onNavigate={() => {}} />,
      ),
    ).not.toThrow();
  });
});
