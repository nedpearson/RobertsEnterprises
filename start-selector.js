const { execSync } = require('child_process');
const serviceName = process.env.RAILWAY_SERVICE_NAME || '';

if (serviceName.toLowerCase().includes('web') || serviceName.toLowerCase().includes('frontend')) {
  console.log('Detected Web service. Starting React SSR/Static server...');
  execSync('npm run start --workspace vite_react_shadcn_ts', { stdio: 'inherit' });
} else {
  console.log('Detected API/backend service. Starting Worker...');
  try {
    // Ensure we are using the compiled worker dist
    execSync('node apps/marketing/worker/dist/index.js', { stdio: 'inherit' });
  } catch (err) {
    const fs = require('fs');
    const path = require('path');
    const errorMsg = 'WORKER START ERROR: ' + err.message + '\\n' + (err.stdout ? err.stdout.toString() : '') + '\\n' + (err.stderr ? err.stderr.toString() : '');
    fs.writeFileSync(path.join(__dirname, 'apps/marketing/dist/index.html'), '<html><body><h1>WORKER CRASHED</h1><pre>' + errorMsg + '</pre></body></html>');
    execSync('npm run start --workspace vite_react_shadcn_ts', { stdio: 'inherit' });
  }
}
