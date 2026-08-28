const { spawn } = require('child_process');

const WORKER_PORT = '8082';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
let shuttingDown = false;
let worker;
let web;

function spawnChild(name, command, args, options = {}) {
  const isCmd = typeof command === 'string' && command.endsWith('.cmd');
  const child = spawn(command, args, {
    ...options,
    stdio: 'inherit',
    shell: isCmd,
  });

  child.on('error', (error) => {
    console.error(`${name} failed to start:`, error);
    shutdown(1, `${name} spawn error`);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const exitCode = Number.isInteger(code) ? code : 1;
    console.error(`${name} exited unexpectedly (code=${code}, signal=${signal}).`);
    shutdown(exitCode === 0 ? 1 : exitCode, `${name} exited`);
  });

  return child;
}

function stopChild(child, signal = 'SIGTERM') {
  if (!child || child.killed) return;
  try {
    child.kill(signal);
  } catch (error) {
    console.error('Failed to stop child process:', error);
  }
}

function shutdown(exitCode = 0, reason = 'shutdown requested') {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Stopping VowOS runtime: ${reason}`);

  stopChild(worker);
  stopChild(web);

  const forceTimer = setTimeout(() => {
    stopChild(worker, 'SIGKILL');
    stopChild(web, 'SIGKILL');
    process.exit(exitCode);
  }, 5000);
  forceTimer.unref();

  const poll = setInterval(() => {
    const workerStopped = !worker || worker.exitCode !== null || worker.killed;
    const webStopped = !web || web.exitCode !== null || web.killed;
    if (workerStopped && webStopped) {
      clearInterval(poll);
      clearTimeout(forceTimer);
      process.exit(exitCode);
    }
  }, 100);
  poll.unref();
}

console.log('Starting VowOS web service and API worker...');

worker = spawnChild(
  'VowOS API worker',
  process.execPath,
  ['apps/marketing/worker/dist/index.js'],
  { env: { ...process.env, PORT: WORKER_PORT } },
);

web = spawnChild(
  'VowOS web service',
  npmCommand,
  ['run', 'start', '--workspace', 'vite_react_shadcn_ts'],
  { env: process.env },
);

process.on('SIGTERM', () => shutdown(0, 'SIGTERM'));
process.on('SIGINT', () => shutdown(0, 'SIGINT'));
process.on('uncaughtException', (error) => {
  console.error('VowOS runtime uncaught exception:', error);
  shutdown(1, 'uncaught exception');
});
process.on('unhandledRejection', (reason) => {
  console.error('VowOS runtime unhandled rejection:', reason);
  shutdown(1, 'unhandled rejection');
});
