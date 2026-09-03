/**
 * Guard against sed/script-mangled template literals in JSX.
 *
 * This repo is patched heavily by generated scripts (patch.js, fix.js,
 * update_*.py, and friends at the repo root). Several of them treat `${...}`
 * as shell interpolation and destroy it, leaving a bare backslash behind.
 *
 * It has happened at least twice:
 *   446ac67  fix: restore missing template literal in DeliveryCenter className
 *   and the Platform Command Center's MRR tile, which shipped to production
 *   rendering a literal "\" where the revenue figure belongs.
 *
 * Neither was caught by typecheck, lint, tests or the build — a stray backslash
 * is perfectly valid JSX text. Only a human looking at the page finds it, which
 * is exactly the kind of defect this suite should be catching instead.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('JSX literal integrity', () => {
  const files = walk(SRC);

  it('finds .tsx files to scan', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('has no JSX text node that is only a backslash', () => {
    // <div>\</div> — the exact shape left behind when `${expr}` is eaten.
    const pattern = />\s*\\\s*</;
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      source.split('\n').forEach((line, i) => {
        if (pattern.test(line)) {
          offenders.push(`${path.relative(SRC, file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    expect(
      offenders,
      `Mangled JSX literal(s) — a bare "\\" where an expression belongs:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('has no escaped dollar-brace left in a className or JSX body', () => {
    // className="...\${foo}..." — the other residue shape.
    const pattern = /\\\$\{/;
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      source.split('\n').forEach((line, i) => {
        if (pattern.test(line)) {
          offenders.push(`${path.relative(SRC, file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    expect(
      offenders,
      `Escaped \${...} that should be a live template expression:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
