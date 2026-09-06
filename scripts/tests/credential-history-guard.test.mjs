/**
 * The guard's blocking path is the part that has to work, so it is tested
 * against a real commit range from this repository's own history — the commit
 * that introduced FORM_BRIDGE_SECRET.txt. A guard tested only against a
 * synthetic fixture is a guard nobody has proved catches the real thing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const GUARD = fileURLToPath(new URL('../credential-history-guard.mjs', import.meta.url));
const REPO = path.resolve(path.dirname(GUARD), '..');

/** The commit that added FORM_BRIDGE_SECRET.txt. Skips if history is shallow. */
const LEAK_COMMIT = '911b17fa';

function hasCommit(sha) {
  const probe = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: REPO });
  return probe.status === 0;
}

function runGuard(args) {
  return spawnSync(process.execPath, [GUARD, ...args], { cwd: REPO, encoding: 'utf8' });
}

test('a range that introduces a credential file fails the build', { skip: !hasCommit(LEAK_COMMIT) }, () => {
  const result = runGuard(['--range', `${LEAK_COMMIT}^..${LEAK_COMMIT}`]);
  assert.equal(result.status, 1, 'guard must exit non-zero when a PR adds a credential file');
  assert.match(result.stderr, /FORM_BRIDGE_SECRET\.txt/);
  // The remediation advice matters as much as the failure: deleting the file
  // in a follow-up commit is the mistake this repo already made twice.
  assert.match(result.stderr, /rotate/i);
  assert.match(result.stderr, /blob stays/i);
});

test('a range with no credential files does not fail the build', () => {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim();
  const result = runGuard(['--range', `${head}..${head}`]);
  assert.equal(result.status, 0, 'an empty range must not fail');
});

test('the guard never prints the contents of a secret, only its path', { skip: !hasCommit(LEAK_COMMIT) }, () => {
  const result = runGuard(['--range', `${LEAK_COMMIT}^..${LEAK_COMMIT}`]);
  const combined = `${result.stdout}${result.stderr}`;
  // A JWT prefix or a long opaque token in the output would mean the guard
  // leaked the thing it exists to protect.
  assert.doesNotMatch(combined, /eyJhbGciOi/);
  assert.doesNotMatch(combined, /\b[A-Za-z0-9_-]{40,}\b/);
});
