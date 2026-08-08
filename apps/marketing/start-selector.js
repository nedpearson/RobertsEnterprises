import { spawn } from 'child_process';
import path from 'path';

const serviceName = (process.env.RAILWAY_SERVICE_NAME || '').toLowerCase();
const isApi = serviceName.includes('api') || process.env.SERVICE_TYPE === 'api' || process.argv.includes('--api');

if (isApi) {
  console.log('🚀 Detected Railway API service. Starting Express Backend Worker...');
  const child = spawn('node', ['worker/dist/index.js'], { stdio: 'inherit', env: process.env });
  child.on('exit', (code) => process.exit(code || 0));
} else {
  console.log('🌐 Detected Railway Web service. Starting Production SPA Server...');
  const child = spawn('node', ['server.js'], { stdio: 'inherit', env: process.env });
  child.on('exit', (code) => process.exit(code || 0));
}
