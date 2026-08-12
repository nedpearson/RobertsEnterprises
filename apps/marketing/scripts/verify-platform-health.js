/**
 * VowOS Platform Health Verification Script
 * 
 * Verifies feature registry integrity, route registry completeness,
 * and host configuration logic via source inspection.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src', 'config');

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failed++;
  }
}

console.log('\n🔍 --- Running VowOS Platform Health Verification ---\n');

// 1. Host Config File Checks
console.log('1. Host Configuration Verification:');
const hostConfigFile = fs.readFileSync(path.join(srcDir, 'hostConfig.ts'), 'utf8');
assert(hostConfigFile.includes("MARKETING_HOSTS = ['vowos.bridgebox.ai', 'vowos.localhost']"), 'MARKETING_HOSTS array contains vowos.bridgebox.ai and vowos.localhost');
assert(hostConfigFile.includes('export function isMarketingHost'), 'isMarketingHost function exported');

// 2. Feature Registry Checks
console.log('\n2. Feature Registry Integrity:');
const featureRegistryFile = fs.readFileSync(path.join(srcDir, 'featureRegistry.ts'), 'utf8');
const featureMatches = (featureRegistryFile.match(/id:\s*'/g) || []).length;
assert(featureMatches >= 20, `Feature registry contains at least 20 registered features (Found: ${featureMatches})`);
assert(featureRegistryFile.includes('export interface VowOSFeature'), 'VowOSFeature interface exported');

// 3. Route Registry Checks
console.log('\n3. Route Registry Verification:');
const routeRegistryFile = fs.readFileSync(path.join(srcDir, 'routeRegistry.ts'), 'utf8');
const routeMatches = (routeRegistryFile.match(/path:\s*'/g) || []).length;
assert(routeMatches >= 10, `Route registry contains at least 10 routes (Found: ${routeMatches})`);
assert(routeRegistryFile.includes("path: '/'"), "Root path '/' defined in route registry");
assert(routeRegistryFile.includes("path: '/demo'"), "Demo path '/demo' defined in route registry");

console.log(`\n📋 --- Results: ${passed} Passed, ${failed} Failed ---\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✨ All VowOS platform health checks passed!\n');
}
