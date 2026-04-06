#!/usr/bin/env node
/**
 * normalize-statuses.mjs - Normalize tracker rows to canonical English status labels.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

function hasCareerOpsLayout(dir) {
  return (
    existsSync(join(dir, 'config', 'profile.yml')) ||
    existsSync(join(dir, 'data', 'applications.md')) ||
    existsSync(join(dir, 'templates', 'states.yml'))
  );
}

function detectProjectRoot() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--project-root');
  if (idx >= 0 && args[idx + 1]) return resolve(args[idx + 1]);
  if (hasCareerOpsLayout(process.cwd())) return process.cwd();
  if (hasCareerOpsLayout(__dirname)) return __dirname;
  return process.cwd();
}

function loadCanonicalMap(statesPath) {
  const parsed = YAML.parse(readFileSync(statesPath, 'utf-8')) || {};
  const rows = Array.isArray(parsed.states) ? parsed.states : [];
  const labels = new Map();
  for (const row of rows) {
    const label = String(row.label || '').trim();
    if (!label) continue;
    labels.set(label.toLowerCase(), label);
  }
  return labels;
}

const CAREER_OPS = detectProjectRoot();
const APPS_FILE = existsSync(join(CAREER_OPS, 'data', 'applications.md')) ? join(CAREER_OPS, 'data', 'applications.md') : join(CAREER_OPS, 'applications.md');
const STATES_FILE = existsSync(join(CAREER_OPS, 'templates', 'states.yml')) ? join(CAREER_OPS, 'templates', 'states.yml') : join(CAREER_OPS, 'states.yml');
const DRY_RUN = process.argv.includes('--dry-run');
const CANONICAL = loadCanonicalMap(STATES_FILE);

function normalizeStatus(raw) {
  const stripped = String(raw || '').replace(/\*\*/g, '').replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
  const lower = stripped.toLowerCase();
  if (CANONICAL.has(lower)) return { status: CANONICAL.get(lower) };
  if (/^(duplicate|repost)/i.test(lower)) return { status: 'Discarded', moveToNotes: raw.trim() };
  if (stripped === '' || stripped === '-' || stripped === '—') return { status: 'Discarded' };
  return { status: null, unknown: true };
}

if (!existsSync(APPS_FILE)) {
  console.log('No applications.md found. Nothing to normalize.');
  process.exit(0);
}

const content = readFileSync(APPS_FILE, 'utf-8');
const lines = content.split('\n');
let changes = 0;
let unknowns = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.startsWith('|')) continue;
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 9) continue;
  if (parts[1] === '#' || parts[1] === '---' || parts[1] === '') continue;
  const num = parseInt(parts[1], 10);
  if (isNaN(num)) continue;

  const result = normalizeStatus(parts[6]);
  if (result.unknown) {
    unknowns.push({ num, rawStatus: parts[6], line: i + 1 });
    continue;
  }
  if (result.status === parts[6]) continue;

  const oldStatus = parts[6];
  parts[6] = result.status;
  if (result.moveToNotes) {
    const existing = parts[9] || '';
    if (!existing.includes(result.moveToNotes)) parts[9] = result.moveToNotes + (existing ? '. ' + existing : '');
  }
  if (parts[5]) parts[5] = parts[5].replace(/\*\*/g, '');
  lines[i] = '| ' + parts.slice(1, -1).join(' | ') + ' |';
  changes++;
  console.log(`#${num}: "${oldStatus}" -> "${result.status}"`);
}

if (unknowns.length > 0) {
  console.log(`\nWARN ${unknowns.length} unknown statuses:`);
  for (const u of unknowns) console.log(`  #${u.num} (line ${u.line}): "${u.rawStatus}"`);
}

console.log(`\n${changes} statuses normalized`);

if (!DRY_RUN && changes > 0) {
  copyFileSync(APPS_FILE, APPS_FILE + '.bak');
  writeFileSync(APPS_FILE, lines.join('\n'));
  console.log('Written to applications.md (backup created).');
} else if (DRY_RUN) {
  console.log('(dry-run - no changes written)');
} else {
  console.log('No changes needed');
}
