const http = require('http');
const { spawn } = require('child_process');

const WORKER_PORT = '8082';
const WEB_PORT = '8083'; // Use a different port so we don't conflict with start-selector
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

let logs = '';
function log(msg) {
  console.log(msg);
  logs += msg + '\n';
}

function spawnChild(name, command, args, options = {}) {
  log(Spawning  with command:  );
  const child = spawn(command, args, {
    ...options,
    shell: true,
  });

  child.stdout.on('data', (data) => log([ STDOUT] ));
  child.stderr.on('data', (data) => log([ STDERR] ));

  child.on('error', (error) => {
    log([ ERROR] );
  });

  child.on('exit', (code, signal) => {
    log([ EXIT] code= signal=);
  });

  return child;
}

const worker = spawnChild(
  'worker',
  process.execPath,
  ['apps/marketing/worker/dist/index.js'],
  { env: { ...process.env, PORT: WORKER_PORT } },
);

const web = spawnChild(
  'web',
  npmCommand,
  ['run', 'start', '--workspace', 'vite_react_shadcn_ts'],
  { env: { ...process.env, PORT: WEB_PORT } },
);

// Start an emergency HTTP server to expose the logs
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(logs);
});

server.listen(process.env.PORT || 8080, '0.0.0.0', () => {
  log(Emergency log server listening on port );
});

process.on('uncaughtException', (err) => log([UNCAUGHT] ));
process.on('unhandledRejection', (err) => log([UNHANDLED] ));
