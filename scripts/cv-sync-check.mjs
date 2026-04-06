#!/usr/bin/env node

/**
 * cv-sync-check.mjs - Validates that the career-ops setup is consistent.
 *
 * Checks:
 * 1. cv.md exists
 * 2. config/profile.yml exists and has required fields
 * 3. No hardcoded metrics in shared instruction files
 * 4. article-digest.md freshness (if exists)
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
function hasCareerOpsLayout(dir) {
  return (
    existsSync(join(dir, 'config', 'profile.yml')) ||
    existsSync(join(dir, 'cv.md')) ||
    existsSync(join(dir, 'data', 'applications.md')) ||
    existsSync(join(dir, 'templates', 'states.yml'))
  );
}

function detectProjectRoot() {
  const args = process.argv.slice(2);
  const projectRootArgIndex = args.indexOf('--project-root');
  if (projectRootArgIndex >= 0 && args[projectRootArgIndex + 1]) {
    return args[projectRootArgIndex + 1];
  }

  if (hasCareerOpsLayout(process.cwd())) {
    return process.cwd();
  }

  if (hasCareerOpsLayout(__dirname)) {
    return __dirname;
  }

  return process.cwd();
}

const projectRoot = detectProjectRoot();

const warnings = [];
const errors = [];

const cvPath = join(projectRoot, 'cv.md');
if (!existsSync(cvPath)) {
  errors.push('cv.md not found in project root. Create it with your CV in markdown format.');
} else {
  const cvContent = readFileSync(cvPath, 'utf-8');
  if (cvContent.trim().length < 100) {
    warnings.push('cv.md seems too short. Make sure it contains your full CV.');
  }
}

const profilePath = join(projectRoot, 'config', 'profile.yml');
if (!existsSync(profilePath)) {
  errors.push('config/profile.yml not found. Copy from config/profile.example.yml and fill in your details.');
} else {
  const profileContent = readFileSync(profilePath, 'utf-8');
  const requiredFields = ['full_name', 'email', 'location'];
  for (const field of requiredFields) {
    if (!profileContent.includes(field) || profileContent.includes('"Jane Smith"')) {
      warnings.push(`config/profile.yml may still have example data. Check field: ${field}`);
      break;
    }
  }
}

const filesToCheck = [
  { path: join(__dirname, '..', 'references', 'modes', '_shared.md'), name: '_shared.md' },
];

const metricPattern = /\b\d{2,4}\+?\s*(hours?|%|evals?|layers?|tests?|fields?|bases?)\b/gi;

for (const { path, name } of filesToCheck) {
  if (!existsSync(path)) continue;
  const content = readFileSync(path, 'utf-8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('NEVER hardcode') || line.includes('NUNCA hardcode') || line.startsWith('#') || line.startsWith('<!--')) continue;
    const matches = line.match(metricPattern);
    if (matches) {
      warnings.push(`${name}:${i + 1} - Possible hardcoded metric: "${matches[0]}". Should this be read from cv.md/article-digest.md?`);
    }
  }
}

const digestPath = join(projectRoot, 'article-digest.md');
if (existsSync(digestPath)) {
  const stats = statSync(digestPath);
  const daysSinceModified = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
  if (daysSinceModified > 30) {
    warnings.push(`article-digest.md is ${Math.round(daysSinceModified)} days old. Consider updating if your projects have new metrics.`);
  }
}

console.log('\n=== career-ops sync check ===\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('All checks passed.');
} else {
  if (errors.length > 0) {
    console.log(`ERRORS (${errors.length}):`);
    errors.forEach(e => console.log(`  ERROR: ${e}`));
  }
  if (warnings.length > 0) {
    console.log(`\nWARNINGS (${warnings.length}):`);
    warnings.forEach(w => console.log(`  WARN: ${w}`));
  }
}

console.log('');
process.exit(errors.length > 0 ? 1 : 0);
