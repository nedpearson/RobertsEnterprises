import { requestClient } from './client';

export interface SystemSettings {
  business_rules: {
    taxRate: number;
    [key: string]: any;
  };
  users: any[];
}

export async function getSystemSettings(): Promise<SystemSettings> {
  return requestClient<SystemSettings>('/system/settings');
}

export async function updateBusinessRules(rules: Record<string, any>): Promise<{ rules: Record<string, any> }> {
  return requestClient<{ rules: Record<string, any> }>('/system/settings/rules', {
    method: 'POST',
    body: JSON.stringify(rules),
  });
}

export async function createSystemUser(user: Record<string, any>): Promise<{ id: number; message: string }> {
  return requestClient<{ id: number; message: string }>('/system/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

export async function seedDatabase(): Promise<void> {
  await requestClient('/seed', { method: 'POST', skipAuth: true });
  await requestClient('/inventory/seed', { method: 'POST', skipAuth: true });
  await requestClient('/invoices/seed', { method: 'POST', skipAuth: true });
  await requestClient('/operations/seed', { method: 'POST', skipAuth: true });
}
