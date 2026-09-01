#!/usr/bin/env node
/**
 * Tenant isolation guard.
 *
 * Every rule here exists because the pattern was shipped, found in an audit,
 * fixed, and then REINTRODUCED by a later commit. A grep gate is what stops the
 * third occurrence. Run from the repo root: `node scripts/tenant-isolation-guard.mjs`.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolved from the script's own location so the guard behaves identically
// whether CI runs it from the repo root or from a workspace directory.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'apps', 'marketing');
const SRC = join(APP, 'src');
const MIGRATIONS = join(APP, 'supabase', 'migrations');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'test-results', 'playwright-report', 'coverage']);

/** Demo/in-memory fixtures are not tenant surfaces. */
const isExempt = (p) =>
  /\.test\.[tj]sx?$/.test(p) ||
  p.includes(`${sep}tests${sep}`) ||
  p.includes(`${sep}demo${sep}`) ||
  p.includes(`${sep}e2e${sep}`);

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const violations = [];
const record = (rule, file, line, text) =>
  violations.push({ rule, file: relative(ROOT, file), line, text: text.trim().slice(0, 160) });

// ── Rule 1: records associated by customer NAME ──────────────────────────────
// A bride portal that loads `contracts WHERE customer = 'Jane Smith'` serves any
// Jane Smith's contracts, including one in another tenant.
const NAME_JOIN_TABLES = ['appointments', 'invoices', 'contracts', 'alterations'];
const NAME_JOIN = /\.eq\(\s*['"]customer['"]\s*,/;

for (const file of walk(SRC)) {
  if (!/\.[tj]sx?$/.test(file) || isExempt(file)) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (!NAME_JOIN.test(line)) return;
    const context = lines.slice(Math.max(0, i - 6), i + 1).join('\n');
    if (NAME_JOIN_TABLES.some((t) => context.includes(`from('${t}')`) || context.includes(`from("${t}")`))) {
      record('name-join', file, i + 1, line);
    }
  });
}

// ── Rule 2: hard-coded fallback tenant ids ──────────────────────────────────
const FALLBACK_ORG = /['"][0-9a-f]{8}-0{4}-0{4}-0{4}-0{12}['"]/i;
for (const file of walk(SRC)) {
  if (!/\.[tj]sx?$/.test(file) || isExempt(file)) continue;
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (FALLBACK_ORG.test(line) && /business_id|organization_id|tenant_id/.test(line)) {
      record('fallback-tenant-id', file, i + 1, line);
    }
  });
}

// ── Rules 3-5: migration-level policy regressions ───────────────────────────
// Migrations are append-only history: the permissive policies in files older than
// the watermark were closed by 20261001000002 / 20261001000005, and rewriting
// history would break every applied database. Those files are therefore frozen,
// and the FINISHED schema is asserted instead by
// 20261001000007_tenant_isolation_assertions.sql, which runs on every
// `supabase start`. This static rule governs NEW migrations only.
const MIGRATION_WATERMARK = '20261001000002';
const USING_TRUE = /USING\s*\(\s*true\s*\)/i;
// Match only the actual tenant column names, not safe function parameters such
// as p_business_id that reject NULL before any query is executed.
const NULL_TENANT = /(?:^|[^A-Za-z0-9_])\(?\s*(business_id|organization_id|tenant_id)\s+IS\s+NULL\s*\)?\s+OR/i;
const CREATE_VIEW = /CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+([a-z_.]+)/i;

for (const file of walk(MIGRATIONS)) {
  if (!file.endsWith('.sql')) continue;
  const version = file.split(sep).pop().split('_')[0];
  if (version <= MIGRATION_WATERMARK) continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (line.trim().startsWith('--')) return;
    if (USING_TRUE.test(line)) record('using-true', file, i + 1, line);
    if (NULL_TENANT.test(line)) record('null-tenant-escape', file, i + 1, line);
    const view = CREATE_VIEW.exec(line);
    if (view) {
      // A view without security_invoker executes as its owner and bypasses RLS
      // on its base tables. Must be declared within the same statement.
      const stmt = text.slice(text.indexOf(line), text.indexOf(';', text.indexOf(line)));
      const laterAlter = new RegExp(`ALTER\\s+VIEW\\s+${view[2].replace('.', '\\.')}\\s+SET\\s*\\(\\s*security_invoker`, 'i');
      if (!/security_invoker/i.test(stmt) && !laterAlter.test(text)) {
        record('view-without-security-invoker', file, i + 1, line);
      }
    }
  });
}

// ── Rule 6: duplicate migration versions ────────────────────────────────────
// Supabase keys applied migrations by the numeric prefix; two files sharing one
// version break `supabase start` and every downstream reset.
const seen = new Map();
for (const name of (existsSync(MIGRATIONS) ? readdirSync(MIGRATIONS) : []).filter((f) => f.endsWith('.sql')).sort()) {
  const version = name.split('_')[0];
  if (seen.has(version)) {
    record('duplicate-migration-version', join(MIGRATIONS, name), 0, `${version}: ${seen.get(version)} and ${name}`);
  } else {
    seen.set(version, name);
  }
}

if (violations.length === 0) {
  console.log('tenant-isolation-guard: clean (6 rules checked)');
  process.exit(0);
}

console.error(`tenant-isolation-guard: ${violations.length} violation(s)\n`);
for (const v of violations) {
  console.error(`  [${v.rule}] ${v.file}:${v.line}\n      ${v.text}`);
}
console.error(`
These patterns have each caused a production tenant-isolation defect in this
repository. If a violation is intentional, fix the rule in
scripts/tenant-isolation-guard.mjs -- do not silence it at the call site.`);
process.exit(1);
