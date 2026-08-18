/**
 * Page metadata extraction: Open Graph, Twitter Cards, canonical, robots and
 * schema.org JSON-LD.
 *
 * This is what decides whether a page looks like a real business when someone
 * pastes it into Instagram DMs, Facebook, or a text message — the single most
 * common way a bridal boutique's link gets shared. PageSpeed does not report it,
 * so it is fetched separately from the same crawl.
 *
 * Regex parsing rather than a DOM library on purpose: the worker should not pull
 * a full HTML parser to read a dozen head tags, and malformed markup must yield
 * a partial result rather than throwing mid-audit.
 */

export interface PageMetadata {
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_type: string | null;
  twitter_card: string | null;
  twitter_title: string | null;
  twitter_image: string | null;
  canonical_url: string | null;
  robots_directives: string | null;
  schema_types: string[];
  social_score: number;
  issues: Array<{ code: string; severity: 'high' | 'medium' | 'low'; message: string }>;
}

/** Matches <meta property="og:title" content="..."> in either attribute order. */
function metaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*?content\\s*=\\s*["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*?(?:property|name)\\s*=\\s*["']${escaped}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
}

function canonicalOf(html: string): string | null {
  const m = html.match(/<link[^>]+rel\s*=\s*["']canonical["'][^>]*?href\s*=\s*["']([^"']*)["']/i);
  return m?.[1] ? decodeEntities(m[1].trim()) : null;
}

/** Collects @type values from every JSON-LD block, including @graph arrays. */
export function schemaTypes(html: string): string[] {
  const types = new Set<string>();
  const blocks = html.matchAll(
    /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  const collect = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(collect);
      return;
    }
    const obj = node as Record<string, unknown>;
    const t = obj['@type'];
    if (typeof t === 'string') types.add(t);
    if (Array.isArray(t)) t.filter((x): x is string => typeof x === 'string').forEach((x) => types.add(x));
    if (obj['@graph']) collect(obj['@graph']);
  };

  for (const block of blocks) {
    try {
      collect(JSON.parse(block[1].trim()));
    } catch {
      // One malformed block must not lose the others.
    }
  }
  return [...types];
}

/**
 * Score how well the page will render when shared. Weighted by what actually
 * breaks a share preview: no image is the difference between a rich card and a
 * bare grey link.
 */
export function scoreMetadata(meta: Omit<PageMetadata, 'social_score' | 'issues'>): {
  score: number;
  issues: PageMetadata['issues'];
} {
  const issues: PageMetadata['issues'] = [];
  let score = 100;
  const penalise = (points: number, code: string, severity: 'high' | 'medium' | 'low', message: string) => {
    score -= points;
    issues.push({ code, severity, message });
  };

  if (!meta.og_image) {
    penalise(30, 'og_image_missing', 'high', 'No og:image — shared links render as a bare grey box with no picture.');
  }
  if (!meta.og_title) {
    penalise(20, 'og_title_missing', 'high', 'No og:title — social platforms will guess the headline.');
  }
  if (!meta.og_description) {
    penalise(15, 'og_description_missing', 'medium', 'No og:description — no summary line under the shared link.');
  }
  if (!meta.twitter_card) {
    penalise(10, 'twitter_card_missing', 'low', 'No twitter:card — falls back to a small, low-impact preview.');
  }
  if (!meta.canonical_url) {
    penalise(10, 'canonical_missing', 'medium', 'No canonical URL — tracking parameters can split ranking signals.');
  }
  if (meta.robots_directives && /noindex/i.test(meta.robots_directives)) {
    penalise(25, 'noindex', 'high', 'Page is marked noindex — it cannot appear in search results at all.');
  }

  const hasLocalBusiness = meta.schema_types.some((t) => /LocalBusiness|Store|BridalShop|Organization/i.test(t));
  if (!hasLocalBusiness) {
    penalise(
      15,
      'schema_localbusiness_missing',
      'medium',
      'No LocalBusiness/Organization structured data — this is what feeds rich results and Google’s local panel.',
    );
  }

  return { score: Math.max(0, score), issues };
}

export function parseMetadata(html: string): PageMetadata {
  const base = {
    og_title: metaContent(html, 'og:title'),
    og_description: metaContent(html, 'og:description'),
    og_image: metaContent(html, 'og:image'),
    og_type: metaContent(html, 'og:type'),
    twitter_card: metaContent(html, 'twitter:card'),
    twitter_title: metaContent(html, 'twitter:title'),
    twitter_image: metaContent(html, 'twitter:image'),
    canonical_url: canonicalOf(html),
    robots_directives: metaContent(html, 'robots'),
    schema_types: schemaTypes(html),
  };
  const { score, issues } = scoreMetadata(base);
  return { ...base, social_score: score, issues };
}

/** Fetches a page and extracts its metadata. Network failures are the caller's. */
export async function fetchPageMetadata(url: string): Promise<PageMetadata> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'VowOS-SEO-Audit/1.0 (+https://vowos.bridgebox.ai)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Metadata fetch for ${url} returned ${res.status}`);
  // Only the <head> matters, and boutique pages can be megabytes of gallery
  // markup — cap the read so one heavy page cannot stall the whole audit.
  const html = (await res.text()).slice(0, 512_000);
  return parseMetadata(html);
}
