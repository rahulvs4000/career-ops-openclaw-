#!/usr/bin/env node
/**
 * verify-pipeline.mjs - Health check for career-ops pipeline integrity
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
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

function loadCanonicalStatuses(statesPath) {
  const parsed = YAML.parse(readFileSync(statesPath, 'utf-8')) || {};
  const rows = Array.isArray(parsed.states) ? parsed.states : [];
  return new Set(rows.map(row => String(row.label || '').trim().toLowerCase()).filter(Boolean));
}

const CAREER_OPS = detectProjectRoot();
const APPS_FILE = existsSync(join(CAREER_OPS, 'data', 'applications.md')) ? join(CAREER_OPS, 'data', 'applications.md') : join(CAREER_OPS, 'applications.md');
const ADDITIONS_DIR = existsSync(join(CAREER_OPS, 'tracker-additions')) ? join(CAREER_OPS, 'tracker-additions') : join(CAREER_OPS, 'batch', 'tracker-additions');
const STATES_FILE = existsSync(join(CAREER_OPS, 'templates', 'states.yml')) ? join(CAREER_OPS, 'templates', 'states.yml') : join(CAREER_OPS, 'states.yml');
const CANONICAL_STATUSES = loadCanonicalStatuses(STATES_FILE);

let errors = 0;
let warnings = 0;

function error(msg) { console.log(`ERROR ${msg}`); errors++; }
function warn(msg) { console.log(`WARN ${msg}`); warnings++; }
function ok(msg) { console.log(`OK ${msg}`); }

if (!existsSync(APPS_FILE)) {
  console.log('\nNo applications.md found. This is normal for a fresh setup.');
  console.log('The file will be created when you start tracking roles.\n');
  process.exit(0);
}

const content = readFileSync(APPS_FILE, 'utf-8');
const lines = content.split('\n');
const entries = [];

for (const line of lines) {
  if (!line.startsWith('|')) continue;
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 9) continue;
  const num = parseInt(parts[1], 10);
  if (isNaN(num)) continue;
  entries.push({ num, date: parts[2], company: parts[3], role: parts[4], score: parts[5], status: parts[6], pdf: parts[7], report: parts[8], notes: parts[9] || '' });
}

console.log(`\nChecking ${entries.length} entries in applications.md\n`);

let badStatuses = 0;
for (const e of entries) {
  const clean = e.status.replace(/\*\*/g, '').trim();
  const statusOnly = clean.replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
  const lower = statusOnly.toLowerCase();

  if (!CANONICAL_STATUSES.has(lower)) {
    error(`#${e.num}: Non-canonical status "${e.status}"`);
    badStatuses++;
  }

  if (e.status.includes('**')) {
    error(`#${e.num}: Status contains markdown bold: "${e.status}"`);
    badStatuses++;
  }

  if (/\d{4}-\d{2}-\d{2}/.test(e.status)) {
    error(`#${e.num}: Status contains date: "${e.status}" - dates go in date column`);
    badStatuses++;
  }
}
if (badStatuses === 0) ok('All statuses are canonical');

const companyRoleMap = new Map();
let dupes = 0;
for (const e of entries) {
  const key = e.company.toLowerCase().replace(/[^a-z0-9]/g, '') + '::' + e.role.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  if (!companyRoleMap.has(key)) companyRoleMap.set(key, []);
  companyRoleMap.get(key).push(e);
}
for (const [, group] of companyRoleMap) {
  if (group.length > 1) {
    warn(`Possible duplicates: ${group.map(e => `#${e.num}`).join(', ')} (${group[0].company} - ${group[0].role})`);
    dupes++;
  }
}
if (dupes === 0) ok('No exact duplicates found');

let brokenReports = 0;
for (const e of entries) {
  const match = e.report.match(/\]\(([^)]+)\)/);
  if (!match) continue;
  const reportPath = join(CAREER_OPS, match[1]);
  if (!existsSync(reportPath)) {
    error(`#${e.num}: Report not found: ${match[1]}`);
    brokenReports++;
  }
}
if (brokenReports === 0) ok('All report links valid');

let badScores = 0;
for (const e of entries) {
  const s = e.score.replace(/\*\*/g, '').trim();
  if (!/^\d+\.?\d*\/5$/.test(s) && s !== 'N/A' && s !== 'DUP') {
    error(`#${e.num}: Invalid score format: "${e.score}"`);
    badScores++;
  }
}
if (badScores === 0) ok('All scores valid');

let badRows = 0;
for (const line of lines) {
  if (!line.startsWith('|')) continue;
  if (line.includes('---') || line.includes('Company')) continue;
  const parts = line.split('|');
  if (parts.length < 9) {
    error(`Row with <9 columns: ${line.substring(0, 80)}...`);
    badRows++;
  }
}
if (badRows === 0) ok('All rows properly formatted');

let pendingTsvs = 0;
if (existsSync(ADDITIONS_DIR)) {
  const files = readdirSync(ADDITIONS_DIR).filter(f => f.endsWith('.tsv'));
  pendingTsvs = files.length;
  if (pendingTsvs > 0) warn(`${pendingTsvs} pending TSVs in tracker-additions/ (not merged)`);
}
if (pendingTsvs === 0) ok('No pending TSVs');

let boldScores = 0;
for (const e of entries) {
  if (e.score.includes('**')) {
    warn(`#${e.num}: Score has markdown bold: "${e.score}"`);
    boldScores++;
  }
}
if (boldScores === 0) ok('No bold in scores');

console.log('\n' + '='.repeat(50));
console.log(`Pipeline Health: ${errors} errors, ${warnings} warnings`);
if (errors === 0 && warnings === 0) console.log('Pipeline is clean.');
else if (errors === 0) console.log('Pipeline OK with warnings');
else console.log('Pipeline has errors - fix before proceeding');

process.exit(errors > 0 ? 1 : 0);
