import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const forbiddenFiles = new Set(['FORM_BRIDGE_SECRET.txt']);
const retiredBridgeSecretPattern = new RegExp(
  ['super', 'secret', 'form', 'bridge', 'key', '2026'].join('_'),
  'gi',
);

const forbiddenPatterns = [
  { name: 'retired Form Bridge shared secret', re: retiredBridgeSecretPattern },
  { name: 'private key material', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'GitHub personal access token', re: /\bghp_[A-Za-z0-9]{30,}\b/g },
  { name: 'Stripe live secret key', re: /\bsk_live_[A-Za-z0-9]{16,}\b/g },
  { name: 'Shopify shared secret', re: /\bshpss_[A-Za-z0-9]{12,}\b/g },
  { name: 'Supabase secret key', re: /\bsb_secret_[A-Za-z0-9._-]{16,}\b/g },
];

const findings = [];

for (const file of tracked) {
  if (forbiddenFiles.has(path.basename(file))) {
    findings.push(`${file}: forbidden secret-bearing filename`);
    continue;
  }

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (content.includes('\u0000')) continue;

  for (const { name, re } of forbiddenPatterns) {
    re.lastIndex = 0;
    if (re.test(content)) findings.push(`${file}: ${name}`);
  }
}

if (findings.length) {
  console.error('Security scan failed. Potential committed credentials detected:');
  for (const finding of findings) console.error(` - ${finding}`);
  process.exit(1);
}

console.log(`Security scan passed (${tracked.length} tracked files checked).`);
