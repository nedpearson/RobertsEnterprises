import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import express from 'express';

dotenv.config();

export const DATA_PLANE_URL = process.env.VITE_SUPABASE_URL;
export const DATA_PLANE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const DEMO_ORGANIZATION_ID = '11111111-1111-1111-1111-111111111111';
export const PLATFORM_HOSTS = new Set(['vowos.bridgebox.ai', 'vowos.localhost']);
export const TENANT_SUFFIX = '.vowos.bridgebox.ai';

function createConfiguredClient(key?: string): SupabaseClient | null {
  if (!DATA_PLANE_URL || !key) return null;
  return createClient(DATA_PLANE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const publicDataPlaneDb = createConfiguredClient(DATA_PLANE_ANON_KEY);
export const privilegedDataPlaneDb = createConfiguredClient(SERVICE_ROLE_KEY);

export const controlPlaneDb =
  privilegedDataPlaneDb ||
  publicDataPlaneDb ||
  createClient('http://127.0.0.1:54321', 'unconfigured-worker-key', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export const supabase =
  publicDataPlaneDb ||
  createClient('http://127.0.0.1:54321', 'unconfigured-worker-key', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export interface RequestContext {
  db: SupabaseClient;
  tenantId?: string;
  tenantSlug?: string;
  isDemo?: boolean;
  isPlatform?: boolean;
  userId?: string;
  role?: string;
}

export const requireBusinessContext = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const context = (req as any).context as RequestContext | undefined;
  if (!context?.tenantId) {
    return res.status(403).json({ error: 'An active organization is required.' });
  }
  next();
};

export const requireRole = (roles: string[]) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const context = (req as any).context as RequestContext | undefined;
    if (!context?.userId || !context.role) {
      return res.status(401).json({ error: 'Missing or invalid authentication.' });
    }

    const normalizedRole = context.role.toUpperCase();
    if (!roles.map((role) => role.toUpperCase()).includes(normalizedRole)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
