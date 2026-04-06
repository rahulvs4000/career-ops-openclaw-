#!/usr/bin/env node
/**
 * merge-tracker.mjs - Merge tracker additions into applications.md
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, renameSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
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
  const fallback = join(__dirname, '..');
  if (hasCareerOpsLayout(fallback)) return fallback;
  return process.cwd();
}

const CAREER_OPS = detectProjectRoot();
const APPS_FILE = existsSync(join(CAREER_OPS, 'data', 'applications.md')) ? join(CAREER_OPS, 'data', 'applications.md') : join(CAREER_OPS, 'applications.md');
const ADDITIONS_DIR = join(CAREER_OPS, 'batch', 'tracker-additions');
const MERGED_DIR = join(ADDITIONS_DIR, 'merged');
const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY = process.argv.includes('--verify');
const CANONICAL_STATUSES = new Set(['Evaluated', 'Applied', 'Responded', 'Interview', 'Offer', 'Rejected', 'Discarded', 'SKIP']);

function canonicalStatus(status) {
  const clean = String(status || '').replace(/\*\*/g, '').replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
  if (CANONICAL_STATUSES.has(clean)) return clean;
  if (/^(duplicate|repost)/i.test(clean)) return 'Discarded';
  console.warn(`Non-canonical status "${status}" -> defaulting to "Evaluated"`);
  return 'Evaluated';
}

function looksLikeStatus(value) {
  const clean = String(value || '').replace(/\*\*/g, '').replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
  return CANONICAL_STATUSES.has(clean) || /^(duplicate|repost)/i.test(clean);
}

function normalizeCompany(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function roleFuzzyMatch(a, b) {
  const wordsA = String(a || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const wordsB = String(b || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const overlap = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  return overlap.length >= 2;
}

function extractReportNum(reportStr) {
  const m = String(reportStr || '').match(/\[(\d+)\]/);
  return m ? parseInt(m[1], 10) : null;
}

function parseScore(s) {
  const m = String(s || '').replace(/\*\*/g, '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

function parseAppLine(line) {
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 9) return null;
  const num = parseInt(parts[1], 10);
  if (isNaN(num) || num === 0) return null;
  return { num, date: parts[2], company: parts[3], role: parts[4], score: parts[5], status: parts[6], pdf: parts[7], report: parts[8], notes: parts[9] || '', raw: line };
}

function parseTsvContent(content, filename) {
  content = content.trim();
  if (!content) return null;

  let parts;
  let addition;

  if (content.startsWith('|')) {
    parts = content.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 8) {
      console.warn(`Skipping malformed pipe-delimited ${filename}: ${parts.length} fields`);
      return null;
    }
    addition = {
      num: parseInt(parts[0], 10),
      date: parts[1],
      company: parts[2],
      role: parts[3],
      score: parts[4],
      status: canonicalStatus(parts[5]),
      pdf: parts[6],
      report: parts[7],
      notes: parts[8] || ''
    };
  } else {
    parts = content.split('\t');
    if (parts.length < 8) {
      console.warn(`Skipping malformed TSV ${filename}: ${parts.length} fields`);
      return null;
    }

    const col4 = parts[4].trim();
    const col5 = parts[5].trim();
    const col4LooksLikeScore = /^\d+\.?\d*\/5$/.test(col4) || col4 === 'N/A' || col4 === 'DUP';
    const col5LooksLikeScore = /^\d+\.?\d*\/5$/.test(col5) || col5 === 'N/A' || col5 === 'DUP';
    const col4LooksLikeStatus = looksLikeStatus(col4);
    const col5LooksLikeStatus = looksLikeStatus(col5);

    let statusCol;
    let scoreCol;
    if (col4LooksLikeStatus && !col4LooksLikeScore) {
      statusCol = col4;
      scoreCol = col5;
    } else if (col4LooksLikeScore && col5LooksLikeStatus) {
      statusCol = col5;
      scoreCol = col4;
    } else if (col5LooksLikeScore && !col4LooksLikeScore) {
      statusCol = col4;
      scoreCol = col5;
    } else {
      statusCol = col4;
      scoreCol = col5;
    }

    addition = {
      num: parseInt(parts[0], 10),
      date: parts[1],
      company: parts[2],
      role: parts[3],
      status: canonicalStatus(statusCol),
      score: scoreCol,
      pdf: parts[6],
      report: parts[7],
      notes: parts[8] || ''
    };
  }

  if (isNaN(addition.num) || addition.num === 0) {
    console.warn(`Skipping ${filename}: invalid entry number`);
    return null;
  }

  return addition;
}

if (!existsSync(APPS_FILE)) {
  console.log('No applications.md found. Nothing to merge into.');
  process.exit(0);
}

const appContent = readFileSync(APPS_FILE, 'utf-8');
const appLines = appContent.split('\n');
const existingApps = [];
let maxNum = 0;

for (const line of appLines) {
  if (line.startsWith('|') && !line.includes('---') && !line.includes('Company')) {
    const app = parseAppLine(line);
    if (app) {
      existingApps.push(app);
      if (app.num > maxNum) maxNum = app.num;
    }
  }
}

if (!existsSync(ADDITIONS_DIR)) {
  console.log('No tracker-additions directory found.');
  process.exit(0);
}

const tsvFiles = readdirSync(ADDITIONS_DIR).filter(f => f.endsWith('.tsv'));
if (tsvFiles.length === 0) {
  console.log('No pending additions to merge.');
  process.exit(0);
}

tsvFiles.sort((a, b) => {
  const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
  return numA - numB;
});

let added = 0;
let updated = 0;
let skipped = 0;
const newLines = [];

for (const file of tsvFiles) {
  const content = readFileSync(join(ADDITIONS_DIR, file), 'utf-8').trim();
  const addition = parseTsvContent(content, file);
  if (!addition) {
    skipped++;
    continue;
  }

  const reportNum = extractReportNum(addition.report);
  let duplicate = null;

  if (reportNum) duplicate = existingApps.find(app => extractReportNum(app.report) === reportNum);
  if (!duplicate) duplicate = existingApps.find(app => app.num === addition.num);
  if (!duplicate) {
    const normCompany = normalizeCompany(addition.company);
    duplicate = existingApps.find(app => normalizeCompany(app.company) === normCompany && roleFuzzyMatch(addition.role, app.role));
  }

  if (duplicate) {
    const newScore = parseScore(addition.score);
    const oldScore = parseScore(duplicate.score);

    if (newScore > oldScore) {
      const lineIdx = appLines.indexOf(duplicate.raw);
      if (lineIdx >= 0) {
        const canonicalExistingStatus = canonicalStatus(duplicate.status);
        appLines[lineIdx] = `| ${duplicate.num} | ${addition.date} | ${addition.company} | ${addition.role} | ${addition.score} | ${canonicalExistingStatus} | ${duplicate.pdf} | ${addition.report} | Re-eval ${addition.date} (${oldScore}->${newScore}). ${addition.notes} |`;
        updated++;
      }
    } else {
      skipped++;
    }
  } else {
    const entryNum = addition.num > maxNum ? addition.num : ++maxNum;
    if (addition.num > maxNum) maxNum = addition.num;
    newLines.push(`| ${entryNum} | ${addition.date} | ${addition.company} | ${addition.role} | ${addition.score} | ${addition.status} | ${addition.pdf} | ${addition.report} | ${addition.notes} |`);
    added++;
  }
}

if (newLines.length > 0) {
  let insertIdx = -1;
  for (let i = 0; i < appLines.length; i++) {
    if (appLines[i].includes('---') && appLines[i].startsWith('|')) {
      insertIdx = i + 1;
      break;
    }
  }
  if (insertIdx >= 0) appLines.splice(insertIdx, 0, ...newLines);
}

if (!DRY_RUN) {
  writeFileSync(APPS_FILE, appLines.join('\n'));
  if (!existsSync(MERGED_DIR)) mkdirSync(MERGED_DIR, { recursive: true });
  for (const file of tsvFiles) renameSync(join(ADDITIONS_DIR, file), join(MERGED_DIR, file));
}

console.log(`Summary: +${added} added, ${updated} updated, ${skipped} skipped`);
if (DRY_RUN) console.log('(dry-run - no changes written)');

if (VERIFY && !DRY_RUN) {
  const { execSync } = await import('child_process');
  try {
    execSync(`node ${join(__dirname, 'verify-pipeline.mjs')} --project-root ${JSON.stringify(CAREER_OPS)}`, { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}
