const { execSync } = require('child_process');
const serviceName = process.env.RAILWAY_SERVICE_NAME || '';

const { spawn } = require('child_process');

console.log('Starting both Web service and API Worker...');

// Start Worker on port 8081
const workerEnv = { ...process.env, PORT: '8081' };
const worker = spawn('node', ['apps/marketing/worker/dist/index.js'], { stdio: 'inherit', env: workerEnv });

// Start Web server on the default port
const web = spawn('npm', ['run', 'start', '--workspace', 'vite_react_shadcn_ts'], { stdio: 'inherit', env: process.env });

// Handle termination
process.on('SIGTERM', () => {
  worker.kill();
  web.kill();
});
