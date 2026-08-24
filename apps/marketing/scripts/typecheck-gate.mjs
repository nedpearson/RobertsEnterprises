#!/usr/bin/env node
/**
 * Strict application typecheck gate.
 *
 * apps/marketing/tsconfig.json is solution-style, so the application must be
 * checked through tsconfig.app.json. Any TypeScript error fails CI. This keeps
 * runtime ReferenceErrors and accumulated type debt from shipping behind a
 * green workflow.
 */
import { execFileSync } from 'node:child_process';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
let out = '';

try {
  execFileSync(npx, ['tsc', '-p', 'tsconfig.app.json', '--noEmit'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (err) {
  out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
}

const lines = out.split('\n').filter((line) => / error TS\d+:/.test(line));
console.log(`typecheck: ${lines.length} error(s)`);

if (lines.length > 0) {
  console.error('\nTypeScript errors:');
  for (const line of lines) console.error(line);
  process.exit(1);
}
