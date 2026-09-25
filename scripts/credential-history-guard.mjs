/**
 * Credential guard for git *history*, not just the working tree.
 *
 * security-scan.mjs reads `git ls-files` — the current tip. That is why five
 * separate credentials survived it: each was committed, noticed, deleted in a
 * follow-up "purge" commit, and from then on the scanner reported clean while
 * every one of them stayed retrievable with `git log -p` from a public clone.
 * Deleting a file at the tip does not remove its blob from history.
 *
 * Two jobs, deliberately separated:
 *
 *   BLOCKING  — a forbidden filename introduced by the commits in this PR.
 *               Actionable by the person who opened it, so it fails the build.
 *
 *   REPORTING — forbidden filenames already present in origin-reachable
 *               history. Not actionable in a PR (it needs a history rewrite and
 *               a credential rotation), so failing every build on it would just
 *               teach everyone to ignore a red X. It prints instead, loudly.
 *
 * Filenames only. This never reads or prints the contents of a secret.
 *
 * Usage:
 *   node scripts/credential-history-guard.mjs                 # report only
 *   node scripts/credential-history-guard.mjs --range A..B    # + block on new
 *   node scripts/credential-history-guard.mjs --strict        # block on both
 */
import { execFileSync } from 'node:child_process';

/**
 * Every one of these was actually committed to this repository at some point.
 * This is a list of past incidents, not a list of hypotheticals.
 */
const FORBIDDEN_BASENAMES = new Set([
  'FORM_BRIDGE_SECRET.txt',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'anon.txt',
  'railway_vars.env',
]);

/** A real .env is forbidden; .env.example is the documented, safe counterpart. */
const FORBIDDEN_PATTERNS = [
  { name: 'environment file', re: /(^|\/)\.env(\.(local|production|prod|staging))?$/ },
  { name: 'private key', re: /\.(pem|key|p12|pfx)$/ },
  { name: 'ssh key', re: /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/ },
];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
}

function reasonFor(filePath) {
  const basename = filePath.split('/').pop() ?? filePath;
  if (FORBIDDEN_BASENAMES.has(basename)) return 'known credential filename';
  for (const { name, re } of FORBIDDEN_PATTERNS) {
    if (re.test(filePath)) return name;
  }
  return null;
}

/** Files added by the commits in `range`, so a PR is judged on its own changes. */
function addedInRange(range) {
  const output = git(['log', '--diff-filter=A', '--name-only', '--format=', range]);
  return [...new Set(output.split('\n').map((line) => line.trim()).filter(Boolean))];
}

/**
 * Every path that has ever existed on a ref GitHub still serves. Reachability
 * is the thing that matters: a blob nobody can walk to is not an exposure, and
 * a blob on a stale branch is.
 */
function pathsInOriginHistory() {
  const output = git(['rev-list', '--remotes=origin', '--objects']);
  const paths = new Set();
  for (const line of output.split('\n')) {
    const space = line.indexOf(' ');
    if (space > 0) paths.add(line.slice(space + 1).trim());
  }
  return [...paths].filter(Boolean);
}

function branchesContaining(filePath) {
  try {
    const sha = git(['log', '--remotes=origin', '--format=%H', '-1', '--diff-filter=A', '--', filePath]).trim();
    if (!sha) return [];
    return git(['branch', '-r', '--contains', sha])
      .split('\n')
      .map((line) => line.trim().replace(/^origin\//, ''))
      .filter((line) => line && !line.includes('->'));
  } catch {
    return [];
  }
}

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const rangeFlag = args.indexOf('--range');
const range = rangeFlag >= 0 ? args[rangeFlag + 1] : null;

let blocking = [];
if (range) {
  blocking = addedInRange(range)
    .map((file) => ({ file, reason: reasonFor(file) }))
    .filter((entry) => entry.reason);
}

const historical = pathsInOriginHistory()
  .map((file) => ({ file, reason: reasonFor(file) }))
  .filter((entry) => entry.reason);

if (blocking.length) {
  console.error('credential-history-guard: this change adds a credential-bearing file.\n');
  for (const { file, reason } of blocking) console.error(`  ${file} — ${reason}`);
  console.error(
    '\nDo not fix this by deleting the file in a follow-up commit. The blob stays\n' +
    'in history and stays readable from a clone. Rewrite the commit, and rotate\n' +
    'the credential if it was ever pushed.',
  );
  process.exit(1);
}

if (historical.length) {
  const heading = strict ? 'credential-history-guard: FAILED' : 'credential-history-guard: EXISTING EXPOSURE';
  console.error(`${heading} — ${historical.length} credential file(s) reachable from origin.\n`);
  for (const { file, reason } of historical) {
    const branches = branchesContaining(file);
    console.error(`  ${file} — ${reason}; on ${branches.length} origin branch(es)`);
  }
  console.error(
    '\nThese are retrievable with `git log -p` by anyone who can clone this repo.\n' +
    'Deleting them at the tip does not help. Remediation is: rotate every one of\n' +
    'these credentials first, then rewrite history (git filter-repo), then set\n' +
    'this guard to --strict so it can never regress.',
  );
  if (strict) process.exit(1);
  process.exit(0);
}

console.log('credential-history-guard: clean — no credential filenames in origin-reachable history.');
