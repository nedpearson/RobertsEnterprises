export function isTenantApiHost(host) {
  const normalized = String(host || '').trim().toLowerCase();
  return /^api\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.bridgebox\.ai$/.test(normalized);
}
