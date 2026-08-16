import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '64kb' }));

const PORT = process.env.PORT || 8080;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'FFIa0EpESD5acerigJF7';
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

const getHost = (req) => {
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = forwardedHost ? forwardedHost.split(',')[0].trim() : req.hostname;
  return host || '';
};

const PUBLIC_VOWOS_HOST = 'vowos.bridgebox.ai';
const LEGACY_DEMO_HOST = 'demo.vowos.bridgebox.ai';
const LEGACY_DEMO_APP_HOST = 'demoapp.vowos.bridgebox.ai';

// Domain Reconciliation Middleware
app.use((req, res, next) => {
  const host = getHost(req);

  // - Legacy {slug}.bridgebox.ai aliases redirect to the canonical tenant host.
  if (host.endsWith('.bridgebox.ai') && !host.endsWith('.vowos.bridgebox.ai') && host !== PUBLIC_VOWOS_HOST) {
    const tenantSlug = host.split('.')[0];
    const canonicalDomain = `${tenantSlug}.vowos.bridgebox.ai`;
    return res.redirect(301, `https://${canonicalDomain}${req.url}`);
  }

  // - Redirect old demo domains/paths to the new canonical demo subdomain
  if (host === LEGACY_DEMO_APP_HOST || req.path === '/demoapp' || req.path.startsWith('/demoapp/')) {
    const suffix = req.path === '/demoapp' ? '' : req.path.slice('/demoapp'.length);
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return res.redirect(301, `https://${LEGACY_DEMO_HOST}${suffix}${query}`);
  }

  // Redirect /app on marketing site to demo subdomain
  if (host === PUBLIC_VOWOS_HOST && (req.path === '/app' || req.path.startsWith('/app/'))) {
    const suffix = req.path === '/app' ? '' : req.path.slice('/app'.length);
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return res.redirect(302, `https://${LEGACY_DEMO_HOST}${suffix}${query}`);
  }

  if (!host || host.includes('localhost') || host === PUBLIC_VOWOS_HOST) {
    return next();
  }

  next();
});

// Only the vowos.bridgebox.ai domain shows the marketing landing page.
// All other domains (e.g. robertsenterprises.bridgebox.ai) go straight to the app.
const isMarketingHost = (host) => {
  return host === 'vowos.bridgebox.ai' || host === 'vowos.localhost';
};

// Server-side ElevenLabs proxy. Never expose ELEVENLABS_API_KEY to browser bundles.
app.post('/api/demo/narration', async (req, res) => {
  if (!ELEVENLABS_API_KEY) {
    return res.status(503).json({ error: 'Narration service is not configured.' });
  }

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 5000) {
    return res.status(400).json({ error: 'Narration text must be between 1 and 5000 characters.' });
  }

  const stability = Number.isFinite(req.body?.stability)
    ? Math.min(1, Math.max(0, Number(req.body.stability)))
    : 0.35;
  const similarityBoost = Number.isFinite(req.body?.similarityBoost)
    ? Math.min(1, Math.max(0, Number(req.body.similarityBoost)))
    : 0.85;

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELEVENLABS_VOICE_ID)}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL_ID,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      },
    );

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error(`ElevenLabs narration failed: ${upstream.status}`, detail.slice(0, 500));
      return res.status(502).json({ error: 'Narration generation failed.' });
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.status(200).send(audio);
  } catch (error) {
    console.error('ElevenLabs narration proxy error:', error);
    return res.status(502).json({ error: 'Narration service is temporarily unavailable.' });
  }
});

// Proxy API requests to the local worker running on port 8081
app.use('/api', async (req, res, next) => {
  // Do not proxy the debug-log endpoint!
  if (req.url === '/debug-log') return next();
  try {
    const fetchRes = await fetch(`http://localhost:8081/api${req.url}`, {
      method: req.method,
      headers: {
        ...req.headers,
        host: 'localhost:8081',
        'x-forwarded-host': getHost(req)
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
    });
    
    // Copy headers from response
    for (const [key, value] of fetchRes.headers.entries()) {
      res.setHeader(key, value);
    }
    
    res.status(fetchRes.status);
    
    // If it's json, parse and send to avoid buffer issues
    const contentType = fetchRes.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await fetchRes.json();
      res.json(data);
    } else {
      const arrayBuffer = await fetchRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    }
  } catch (err) {
    console.error('API Proxy error:', err);
    res.status(502).json({ error: 'Backend service is unavailable.' });
  }
});

// Asset routing: serve from dist/assets (Vite SPA) and dist/marketing-assets (Famous.ai landing bundle)
app.use('/assets', express.static(path.join(__dirname, 'dist', 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'dist', 'marketing-assets')));

// Serve static files from dist (except index.html — that's handled by the SPA fallback below)
app.use(express.static(path.join(__dirname, 'dist'), { index: false }));



app.get('/api/health/unified', (req, res) => {
  const host = getHost(req);
  res.json({
    status: 'healthy',
    system: 'VowOS Unified Platform',
    version: '2.0.0',
    host,
    isMarketingHost: isMarketingHost(host),
    timestamp: new Date().toISOString()
  });
});

// SPA fallback: Root path (/) on marketing hosts serves the Famous.ai landing page (marketing.html).
// All application paths and ALL paths on tenant subdomains serve index.html.
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const host = getHost(req);
  if (isMarketingHost(host) && (req.path === '/' || req.path === '/marketing.html')) {
    res.sendFile(path.join(__dirname, 'dist', 'marketing.html'));
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
