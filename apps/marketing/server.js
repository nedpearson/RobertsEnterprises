import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
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

// Domain Reconciliation Middleware
// Redirect legacy tenant domains to {slug}.vowos.bridgebox.ai and enforce the
// single public demo URL https://vowos.bridgebox.ai/demo.
app.use((req, res, next) => {
  const host = getHost(req);

  if (req.path === '/demo' || req.path.startsWith('/demo/')) {
    if (host && !host.includes('localhost') && host !== 'vowos.bridgebox.ai') {
      return res.redirect(301, `https://vowos.bridgebox.ai${req.url}`);
    }
  }

  if (!host || host.includes('localhost') || host === 'vowos.bridgebox.ai') {
    return next();
  }

  if (host.endsWith('.bridgebox.ai') && !host.endsWith('.vowos.bridgebox.ai')) {
    const tenantSlug = host.split('.')[0];
    const canonicalDomain = `${tenantSlug}.vowos.bridgebox.ai`;
    return res.redirect(301, `https://${canonicalDomain}${req.url}`);
  }

  next();
});

const isMarketingHost = (host) => host === 'vowos.bridgebox.ai' || host === 'vowos.localhost';

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

// Proxy API requests to the local worker running on port 8081.
// No production log/debug endpoint is exposed through this public proxy.
app.use('/api', async (req, res) => {
  try {
    const fetchRes = await fetch(`http://localhost:8081/api${req.url}`, {
      method: req.method,
      headers: {
        ...req.headers,
        host: 'localhost:8081',
        'x-forwarded-host': getHost(req),
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    for (const [key, value] of fetchRes.headers.entries()) {
      res.setHeader(key, value);
    }

    res.status(fetchRes.status);
    const contentType = fetchRes.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await fetchRes.json();
      return res.json(data);
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('API Proxy error:', err);
    return res.status(502).json({ error: 'Backend service is unavailable.' });
  }
});

app.use('/assets', express.static(path.join(__dirname, 'dist', 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'dist', 'marketing-assets')));
app.use(express.static(path.join(__dirname, 'dist'), { index: false }));

app.get('/api/health/unified', (req, res) => {
  const host = getHost(req);
  res.json({
    status: 'healthy',
    system: 'VowOS Unified Platform',
    version: '2.0.0',
    host,
    isMarketingHost: isMarketingHost(host),
    timestamp: new Date().toISOString(),
  });
});

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
