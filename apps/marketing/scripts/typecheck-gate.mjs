#!/usr/bin/env node
/**
 * Real typecheck gate.
 *
 * "tsc --noEmit" against apps/marketing/tsconfig.json is a NO-OP: that file is
 * a solution-style config ("files": [] + project references), so the old
 * typecheck script checked zero files and always passed - 239 type errors,
 * 27 of them runtime ReferenceErrors, shipped behind a green certify.
 *
 * Policy:
 *   - HARD FAIL on TS2304/TS2552 ("cannot find name") - those throw at runtime.
 *   - RATCHET everything else: the total may go down, never up.
 */
import { execFileSync } from 'node:child_process';

const MAX_TOTAL = 193; // ratchet - lower this as errors are fixed, never raise it
const FATAL = /error (TS2304|TS2552):/;

let out = '';
try {
  execFileSync('npx', ['tsc', '-p', 'tsconfig.app.json', '--noEmit'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: true
  });
} catch (err) {
  out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
}

const lines = out.split('\n').filter((l) => / error TS\d+:/.test(l));
const fatal = lines.filter((l) => FATAL.test(l));

console.log(`typecheck: ${lines.length} error(s) (ratchet ${MAX_TOTAL}), ${fatal.length} fatal`);

if (fatal.length) {
  console.error('\nFATAL - undefined identifiers, these throw at runtime:');
  for (const l of fatal) console.error('  ' + l);
  process.exit(1);
}
if (lines.length > MAX_TOTAL) {
  console.error(`\nType errors increased: ${lines.length} > ${MAX_TOTAL}:`);
  for (const l of lines.slice(0, 40)) console.error('  ' + l);
  process.exit(1);
}
