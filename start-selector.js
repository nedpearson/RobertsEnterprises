const { execSync } = require('child_process');
const serviceName = process.env.RAILWAY_SERVICE_NAME || '';

const { spawn } = require('child_process');

console.log('Starting both Web service and API Worker...');

const fs = require('fs');
const path = require('path');
const logStream = fs.createWriteStream(path.join(__dirname, 'worker.log'), { flags: 'a' });

// Start Worker on port 8081
const workerEnv = { ...process.env, PORT: '8081' };
const worker = spawn('node', ['apps/marketing/worker/dist/index.js'], { env: workerEnv, shell: true });

worker.stdout.pipe(logStream);
worker.stderr.pipe(logStream);

// Start Web server on the default port
const web = spawn('npm', ['run', 'start', '--workspace', 'vite_react_shadcn_ts'], { stdio: 'inherit', env: process.env, shell: true });

// Handle termination
process.on('SIGTERM', () => {
  worker.kill();
  web.kill();
});
