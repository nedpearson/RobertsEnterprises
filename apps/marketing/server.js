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

const crmAppPath = path.join(__dirname, 'dist');
const marketingAppPath = path.join(__dirname, '../vowos-marketing/dist');

// Serve static assets based on hostname
app.use((req, res, next) => {
  const host = getHost(req);
  if (host === 'vowos.bridgebox.ai' || host === 'vowos.localhost') {
    express.static(marketingAppPath, { index: false })(req, res, next);
  } else {
    express.static(crmAppPath, { index: false })(req, res, next);
  }
});

// Fallback routing for SPA
app.get('*', (req, res) => {
  const host = getHost(req);
  if (host === 'vowos.bridgebox.ai' || host === 'vowos.localhost') {
    res.sendFile(path.join(marketingAppPath, 'index.html'));
  } else {
    // For all tenant domains (e.g., robertsenterprises.bridgebox.ai), serve the React SPA
    res.sendFile(path.join(crmAppPath, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
