export function isTenantApiHost(host) {
  const normalized = String(host || '').trim().toLowerCase();
  return /^api\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.bridgebox\.ai$/.test(normalized);
}

export function tenantUiHostFromApiHost(host) {
  const normalized = String(host || '').trim().toLowerCase();
  const match = normalized.match(/^api\.([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\.bridgebox\.ai$/);
  return match ? `${match[1]}.bridgebox.ai` : null;
}
