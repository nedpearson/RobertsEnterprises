const jwtPattern = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;

export function containsSupabaseServiceRoleJwt(content) {
  jwtPattern.lastIndex = 0;
  for (const token of content.match(jwtPattern) ?? []) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      if (payload?.role === 'service_role') return true;
    } catch {
      // Ignore malformed JWT-shaped strings; provider-specific patterns handle
      // other known credential formats.
    }
  }
  return false;
}
