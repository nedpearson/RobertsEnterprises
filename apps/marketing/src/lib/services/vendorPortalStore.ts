import { resolveEffectiveSetting, saveScopedSetting } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

export interface VendorPortal {
  id: string;
  name: string;
  brand: string;
  portalUrl: string;
  username: string;
  password?: string;
  dealerId: string;
  repName: string;
  repPhone: string;
  repEmail: string;
  avgLeadTimeDays: number;
  notes?: string;
}

export async function getVendorPortals(): Promise<VendorPortal[]> {
  const dataPlane = getActiveDataPlane();
  const res = await resolveEffectiveSetting<VendorPortal[]>(
    'vendor_portals_vault',
    'vendor_portals_vault',
    { dataPlane },
    []
  );
  return res.value;
}

export async function saveVendorPortal(portal: VendorPortal): Promise<VendorPortal[]> {
  const current = await getVendorPortals();
  const existingIdx = current.findIndex((p) => p.id === portal.id);
  let updated: VendorPortal[];

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = portal;
  } else {
    updated = [...current, portal];
  }

  const dataPlane = getActiveDataPlane();
  await saveScopedSetting('vendor_portals_vault', 'vendor_portals_vault', updated, { dataPlane }, 'Vendor portal saved');
  return updated;
}

export async function deleteVendorPortal(portalId: string): Promise<VendorPortal[]> {
  const current = await getVendorPortals();
  const updated = current.filter((p) => p.id !== portalId);
  const dataPlane = getActiveDataPlane();
  await saveScopedSetting('vendor_portals_vault', 'vendor_portals_vault', updated, { dataPlane }, 'Vendor portal deleted');
  return updated;
}
