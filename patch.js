const fs = require('fs');
let c = fs.readFileSync('apps/marketing/src/contexts/AuthContext.tsx', 'utf8');

const roleDefs = 
export type StaffRole = 'Owner' | 'Manager' | 'Stylist' | 'Front Desk' | 'Seamstress';

export const STAFF_ROLES: StaffRole[] = ['Owner', 'Manager', 'Stylist', 'Front Desk', 'Seamstress'];

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  Owner: 'Full access - financial ledgers, reports, and staff role management.',
  Manager: 'Runs the stores - everything except managing staff accounts.',
  Stylist: 'Brides, leads, appointments, gown inventory, and transfers.',
  'Front Desk': 'Front-of-house - brides, leads, and the appointment book.',
};

export const ROLE_BADGE_CLASSES: Record<StaffRole, string> = {
  Owner: 'bg-rose-500/20 text-rose-500 ring-1 ring-inset ring-rose-500/30',
  Manager: 'bg-amber-500/20 text-amber-600 ring-1 ring-inset ring-amber-500/30',
  Stylist: 'bg-violet-500/20 text-violet-500 ring-1 ring-inset ring-violet-500/30',
  'Front Desk': 'bg-sky-500/20 text-sky-600 ring-1 ring-inset ring-sky-500/30',
  Seamstress: 'bg-emerald-500/20 text-emerald-600 ring-1 ring-inset ring-emerald-500/30',
};

export function normalizeRole(role: string | null | undefined): StaffRole {
  return (STAFF_ROLES as string[]).includes(role ?? '') ? (role as StaffRole) : 'Stylist';
}

export interface StaffProfile {
  id: string;
  name: string;
  role: StaffRole;
}

export interface UserContext;

c = c.replace('export interface UserContext', roleDefs);
c = c.replace('userContext: UserContext | null;', 'userContext: UserContext | null;\n  profile: StaffProfile | null;');
c = c.replace('tenant, loading, signIn,', 'tenant, profile: userContext ? { id: userContext.id, name: userContext.name, role: normalizeRole(userContext.role) } : null, loading, signIn,');

fs.writeFileSync('apps/marketing/src/contexts/AuthContext.tsx', c);
