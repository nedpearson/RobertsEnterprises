import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', true);

const PORT = process.env.PORT || 8080;

const getHost = (req) => {
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = forwardedHost ? forwardedHost.split(',')[0].trim() : req.hostname;
  return host || '';
};

// Hostname-based asset routing
app.use('/assets', (req, res, next) => {
  const host = getHost(req);
  if (host === 'vowos.bridgebox.ai' || host === 'vowos.localhost') {
    // Serve from marketing-assets
    express.static(path.join(__dirname, 'dist', 'marketing-assets'))(req, res, next);
  } else {
    // Serve from normal assets
    express.static(path.join(__dirname, 'dist', 'assets'))(req, res, next);
  }
});

// Serve everything else normally from dist, but do NOT automatically serve index.html for root path
app.use(express.static(path.join(__dirname, 'dist'), { index: false }));

// Fallback routing for SPA / Marketing
app.get('*', (req, res) => {
  const host = getHost(req);
  if (host === 'vowos.bridgebox.ai' || host === 'vowos.localhost') {
    res.sendFile(path.join(__dirname, 'dist', 'marketing.html'));
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
