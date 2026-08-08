const AUTH_FRAGMENT_KEY = 'auth_token';

/**
 * Accept a cross-origin login handoff from the VowOS portal.
 *
 * The token is delivered in the URL fragment so it is never sent to the
 * static web host in an HTTP request. We immediately persist it to the same
 * localStorage key the application already uses, then scrub the fragment
 * before React renders so it does not remain visible in the address bar.
 */
export function bootstrapVowosAuthHandoff(): void {
  if (typeof window === 'undefined') return;

  const rawHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;

  if (!rawHash) return;

  const params = new URLSearchParams(rawHash);
  const token = params.get(AUTH_FRAGMENT_KEY);
  if (!token) return;

  localStorage.setItem('token', token);
  localStorage.setItem('jwt', token);
  localStorage.setItem('vowos_sso_at', new Date().toISOString());

  params.delete(AUTH_FRAGMENT_KEY);
  const nextHash = params.toString();
  const cleanUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`;
  window.history.replaceState({}, document.title, cleanUrl);
}
