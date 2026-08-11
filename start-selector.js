const { execSync } = require('child_process');
const serviceName = process.env.RAILWAY_SERVICE_NAME || '';

if (serviceName.toLowerCase().includes('api') || serviceName.toLowerCase().includes('worker') || serviceName.toLowerCase().includes('backend')) {
  console.log('Detected API/backend service. Starting Worker...');
  // Ensure we are using the compiled worker dist
  execSync('node apps/marketing/worker/dist/index.js', { stdio: 'inherit' });
} else {
  console.log('Detected Web service. Starting React SSR/Static server...');
  execSync('npm run start --workspace vite_react_shadcn_ts', { stdio: 'inherit' });
}
