import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 8080;

// Hostname-based asset routing
app.use('/assets', (req, res, next) => {
  const host = req.hostname || '';
  if (host === 'vowos.bridgebox.ai' || host === 'vowos.localhost') {
    // Serve from marketing-assets
    express.static(path.join(__dirname, 'dist', 'marketing-assets'))(req, res, next);
  } else {
    // Serve from normal assets
    express.static(path.join(__dirname, 'dist', 'assets'))(req, res, next);
  }
});

// Serve everything else normally from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback routing for SPA / Marketing
app.get('*', (req, res) => {
  const host = req.hostname || '';
  if (host === 'vowos.bridgebox.ai' || host === 'vowos.localhost') {
    res.sendFile(path.join(__dirname, 'dist', 'marketing.html'));
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
