const { execSync } = require('child_process');
const serviceName = process.env.RAILWAY_SERVICE_NAME || '';

if (serviceName.toLowerCase().includes('web')) {
  console.log('Detected Web service. Starting static server...');
  execSync('node apps/web/static-server.mjs', { stdio: 'inherit' });
} else {
  console.log('Detected API/backend service. Running migrations and starting backend...');
  // Knex migration command
  execSync('npm run migrate --workspace apps/api', { stdio: 'inherit' });
  // Start Express server
  execSync('node apps/api/server.js', { stdio: 'inherit' });
}
