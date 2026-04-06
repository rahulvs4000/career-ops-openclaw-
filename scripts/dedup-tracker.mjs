#!/usr/bin/env node
/**
 * dedup-tracker.mjs - Remove duplicate entries from applications.md
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

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

const CAREER_OPS = detectProjectRoot();
const APPS_FILE = existsSync(join(CAREER_OPS, 'data', 'applications.md')) ? join(CAREER_OPS, 'data', 'applications.md') : join(CAREER_OPS, 'applications.md');
const DRY_RUN = process.argv.includes('--dry-run');
const STATUS_RANK = new Map([
  ['SKIP', 0],
  ['Discarded', 0],
  ['Rejected', 1],
  ['Evaluated', 2],
  ['Applied', 3],
  ['Responded', 4],
  ['Interview', 5],
  ['Offer', 6]
]);

function canonicalStatus(status) {
  const clean = String(status || '').replace(/\*\*/g, '').replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
  if (STATUS_RANK.has(clean)) return clean;
  if (/^(duplicate|repost)/i.test(clean)) return 'Discarded';
  return clean || 'Evaluated';
}

function statusRank(status) {
  return STATUS_RANK.get(canonicalStatus(status)) ?? 0;
}

function normalizeCompany(name) {
  return String(name || '').toLowerCase().replace(/[()]/g, '').replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();
}

function normalizeRole(role) {
  return String(role || '').toLowerCase().replace(/[()]/g, ' ').replace(/\s+/g, ' ').replace(/[^a-z0-9 /]/g, '').trim();
}

function roleMatch(a, b) {
  const wordsA = normalizeRole(a).split(/\s+/).filter(w => w.length > 3);
  const wordsB = normalizeRole(b).split(/\s+/).filter(w => w.length > 3);
  const overlap = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  return overlap.length >= 2;
}

function parseScore(s) {
  const m = String(s || '').replace(/\*\*/g, '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

function parseAppLine(line) {
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 9) return null;
  const num = parseInt(parts[1], 10);
  if (isNaN(num)) return null;
  return { num, date: parts[2], company: parts[3], role: parts[4], score: parts[5], status: parts[6], pdf: parts[7], report: parts[8], notes: parts[9] || '', raw: line };
}

if (!existsSync(APPS_FILE)) {
  console.log('No applications.md found. Nothing to dedup.');
  process.exit(0);
}

const content = readFileSync(APPS_FILE, 'utf-8');
const lines = content.split('\n');
const entries = [];
const entryLineMap = new Map();

for (let i = 0; i < lines.length; i++) {
  if (!lines[i].startsWith('|')) continue;
  const app = parseAppLine(lines[i]);
  if (app && app.num > 0) {
    entries.push(app);
    entryLineMap.set(app.num, i);
  }
}

const groups = new Map();
for (const entry of entries) {
  const key = normalizeCompany(entry.company);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(entry);
}

let removed = 0;
const linesToRemove = new Set();

for (const [, companyEntries] of groups) {
  if (companyEntries.length < 2) continue;
  const processed = new Set();
  for (let i = 0; i < companyEntries.length; i++) {
    if (processed.has(i)) continue;
    const cluster = [companyEntries[i]];
    processed.add(i);
    for (let j = i + 1; j < companyEntries.length; j++) {
      if (processed.has(j)) continue;
      if (roleMatch(companyEntries[i].role, companyEntries[j].role)) {
        cluster.push(companyEntries[j]);
        processed.add(j);
      }
    }
    if (cluster.length < 2) continue;

    cluster.sort((a, b) => parseScore(b.score) - parseScore(a.score));
    const keeper = cluster[0];
    let bestStatus = canonicalStatus(keeper.status);
    let bestRank = statusRank(keeper.status);

    for (let k = 1; k < cluster.length; k++) {
      const rank = statusRank(cluster[k].status);
      if (rank > bestRank) {
        bestRank = rank;
        bestStatus = canonicalStatus(cluster[k].status);
      }
    }

    if (bestStatus !== keeper.status) {
      const lineIdx = entryLineMap.get(keeper.num);
      if (lineIdx !== undefined) {
        const parts = lines[lineIdx].split('|').map(s => s.trim());
        parts[6] = bestStatus;
        lines[lineIdx] = '| ' + parts.slice(1, -1).join(' | ') + ' |';
      }
    }

    for (let k = 1; k < cluster.length; k++) {
      const dup = cluster[k];
      const lineIdx = entryLineMap.get(dup.num);
      if (lineIdx !== undefined) {
        linesToRemove.add(lineIdx);
        removed++;
      }
    }
  }
}

for (const idx of [...linesToRemove].sort((a, b) => b - a)) lines.splice(idx, 1);

console.log(`${removed} duplicates removed`);

if (!DRY_RUN && removed > 0) {
  copyFileSync(APPS_FILE, APPS_FILE + '.bak');
  writeFileSync(APPS_FILE, lines.join('\n'));
  console.log('Written to applications.md (backup created).');
} else if (DRY_RUN) {
  console.log('(dry-run - no changes written)');
} else {
  console.log('No duplicates found');
}
