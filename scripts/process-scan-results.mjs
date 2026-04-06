#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

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
    return resolve(args[projectRootArgIndex + 1]);
  }

  const cwd = process.cwd();
  if (hasCareerOpsLayout(cwd)) return cwd;

  const fallback = join(__dirname, '..');
  if (hasCareerOpsLayout(fallback)) return fallback;

  return cwd;
}

function getArg(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function readYaml(path) {
  if (!existsSync(path)) return null;
  return YAML.parse(readFileSync(path, 'utf-8'));
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function compact(value) {
  return String(value || '').trim();
}

function hasPhrase(text, phrase) {
  const haystack = normalize(text);
  const needle = normalize(phrase);
  return needle.length > 0 && haystack.includes(needle);
}

function firstUrl(text) {
  const match = String(text || '').match(/https?:\/\/[^\s|)]+|local:[^\s|)]+/i);
  return match ? match[0] : '';
}

function lineKey(company, role) {
  const companyKey = normalize(company).replace(/\s+/g, '');
  const roleKey = normalize(role).replace(/\s+/g, ' ');
  if (!companyKey || !roleKey) return '';
  return `${companyKey}::${roleKey}`;
}

function parsePipelineEntries(content) {
  return content
    .split(/\r?\n/)
    .filter(line => /^- \[[^\]]+\]/.test(line))
    .map(line => {
      const parts = line.replace(/^- \[[^\]]+\]\s*/, '').split('|').map(part => part.trim());
      const url = firstUrl(line);
      return {
        url,
        company: parts[2] || '',
        role: parts[3] || '',
      };
    });
}

function parseApplications(content) {
  return content
    .split(/\r?\n/)
    .filter(line => line.startsWith('|') && !line.includes('---') && !line.includes('Empresa'))
    .map(line => line.split('|').map(part => part.trim()))
    .filter(parts => parts.length >= 9)
    .map(parts => ({ company: parts[3] || '', role: parts[4] || '' }));
}

function parseHistory(content) {
  return content
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0 && !line.startsWith('found_on\t'))
    .map(line => {
      const parts = line.split('\t');
      return {
        url: parts[4] || firstUrl(line),
        company: parts[2] || '',
        role: parts[3] || '',
      };
    });
}

function buildSeenState(projectRoot) {
  const seenUrls = new Set();
  const seenKeys = new Set();

  const pipelinePath = join(projectRoot, 'data', 'pipeline.md');
  if (existsSync(pipelinePath)) {
    for (const entry of parsePipelineEntries(readFileSync(pipelinePath, 'utf-8'))) {
      if (entry.url) seenUrls.add(entry.url);
      const key = lineKey(entry.company, entry.role);
      if (key) seenKeys.add(key);
    }
  }

  const appsPath = existsSync(join(projectRoot, 'data', 'applications.md'))
    ? join(projectRoot, 'data', 'applications.md')
    : join(projectRoot, 'applications.md');
  if (existsSync(appsPath)) {
    for (const entry of parseApplications(readFileSync(appsPath, 'utf-8'))) {
      const key = lineKey(entry.company, entry.role);
      if (key) seenKeys.add(key);
    }
  }

  const historyPath = join(projectRoot, 'data', 'scan-history.tsv');
  if (existsSync(historyPath)) {
    for (const entry of parseHistory(readFileSync(historyPath, 'utf-8'))) {
      if (entry.url) seenUrls.add(entry.url);
      const key = lineKey(entry.company, entry.role);
      if (key) seenKeys.add(key);
    }
  }

  return { seenUrls, seenKeys };
}

function buildScore(job, profile, portals) {
  const title = compact(job.title);
  const company = compact(job.company);
  const location = compact(job.location);
  const source = compact(job.source);
  const summary = compact(job.summary);
  const keywordText = Array.isArray(job.keywords) ? job.keywords.join(' ') : compact(job.keywords);
  const text = [title, company, location, summary, keywordText, source].join(' ');
  const titleLower = normalize(title);

  const primaryRoles = profile?.target_roles?.primary || [];
  const archetypes = (profile?.target_roles?.archetypes || []).map(item => item.name).filter(Boolean);
  const searchPreferences = profile?.search_preferences || {};
  const positive = portals?.title_filter?.positive || [];
  const negative = portals?.title_filter?.negative || [];
  const seniorityBoost = portals?.title_filter?.seniority_boost || [];
  const preferredCompanies = searchPreferences.preferred_companies || [];
  const priorityKeywords = searchPreferences.priority_keywords || [];
  const preferredLocations = searchPreferences.preferred_locations || [];
  const excludeLocations = searchPreferences.exclude_locations || [];
  const threshold = searchPreferences.minimum_relevance_score || 75;

  for (const term of negative) {
    if (hasPhrase(titleLower, term)) {
      return { score: 0, threshold, decision: 'skipped_title', reasons: [`negative title keyword: ${term}`] };
    }
  }

  for (const locationTerm of excludeLocations) {
    if (hasPhrase(text, locationTerm)) {
      return { score: 0, threshold, decision: 'skipped_location', reasons: [`excluded location: ${locationTerm}`] };
    }
  }

  let score = 0;
  const reasons = [];

  const primaryMatches = primaryRoles.filter(role => hasPhrase(title, role));
  if (primaryMatches.length > 0) {
    score += Math.min(45, 30 + (primaryMatches.length - 1) * 10);
    reasons.push(`primary role match: ${primaryMatches.join(', ')}`);
  }

  const archetypeMatches = archetypes.filter(role => hasPhrase(title, role) || hasPhrase(summary, role));
  if (archetypeMatches.length > 0) {
    score += Math.min(20, archetypeMatches.length * 10);
    reasons.push(`archetype match: ${archetypeMatches.join(', ')}`);
  }

  const positiveHits = positive.filter(term => hasPhrase(text, term));
  if (positiveHits.length > 0) {
    score += Math.min(15, positiveHits.length * 3);
    reasons.push(`positive keywords: ${positiveHits.slice(0, 4).join(', ')}`);
  }

  const priorityHits = priorityKeywords.filter(term => hasPhrase(text, term));
  if (priorityHits.length > 0) {
    score += Math.min(15, priorityHits.length * 5);
    reasons.push(`priority keywords: ${priorityHits.join(', ')}`);
  }

  const preferredCompany = preferredCompanies.find(name => hasPhrase(company, name));
  if (preferredCompany) {
    score += 10;
    reasons.push(`preferred company: ${preferredCompany}`);
  }

  const seniorityHit = seniorityBoost.find(term => hasPhrase(title, term));
  if (seniorityHit) {
    score += 5;
    reasons.push(`seniority boost: ${seniorityHit}`);
  }

  const preferredLocation = preferredLocations.find(term => hasPhrase(text, term));
  if (preferredLocation) {
    score += 10;
    reasons.push(`preferred location: ${preferredLocation}`);
  }

  if (score === 0) {
    return { score: 0, threshold, decision: 'skipped_score', reasons: ['no meaningful role alignment'] };
  }

  score = Math.min(100, score);
  const decision = score >= threshold ? 'selected' : 'skipped_score';
  return { score, threshold, decision, reasons };
}

function ensureDataFiles(projectRoot) {
  const dataDir = join(projectRoot, 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const historyPath = join(projectRoot, 'data', 'scan-history.tsv');
  if (!existsSync(historyPath)) {
    writeFileSync(historyPath, 'found_on\tscore\tcompany\trole\turl\tsource\tdecision\tdelivery\n');
  }

  const pipelinePath = join(projectRoot, 'data', 'pipeline.md');
  if (!existsSync(pipelinePath)) {
    writeFileSync(pipelinePath, '## Pendientes\n\n## Procesadas\n');
  }
}

function updatePipeline(projectRoot, acceptedJobs) {
  if (acceptedJobs.length === 0) return;
  const pipelinePath = join(projectRoot, 'data', 'pipeline.md');
  const content = readFileSync(pipelinePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const pendingIndex = lines.findIndex(line => line.trim() === '## Pendientes');
  const insertIndex = pendingIndex >= 0 ? pendingIndex + 1 : lines.length;
  const newLines = acceptedJobs.map(job => `- [ ] ${job.foundOn} | ${job.score} | ${job.company} | ${job.title} | ${job.url} | ${job.source}`);
  lines.splice(insertIndex + 1, 0, ...newLines);
  writeFileSync(pipelinePath, lines.join('\n'));
}

function appendHistory(projectRoot, historyRows) {
  if (historyRows.length === 0) return;
  const historyPath = join(projectRoot, 'data', 'scan-history.tsv');
  const current = readFileSync(historyPath, 'utf-8');
  const suffix = current.endsWith('\n') ? '' : '\n';
  writeFileSync(historyPath, current + suffix + historyRows.join('\n') + '\n');
}

function buildDigest(acceptedJobs, threshold, foundOn, totals) {
  const header = [
    `Career-Ops scan digest - ${foundOn}`,
    `Threshold: ${threshold}/100`,
    `New high-relevance roles: ${acceptedJobs.length}`,
    `Duplicates skipped: ${totals.duplicates}`,
    `Below threshold: ${totals.lowScore}`,
    ''
  ];

  const body = acceptedJobs.map((job, index) => [
    `${index + 1}. ${job.company} - ${job.title}`,
    `score: ${job.score}`,
    `found: ${job.foundOn}`,
    `source: ${job.source || 'unknown'}`,
    `location: ${job.location || 'unknown'}`,
    `url: ${job.url}`,
    `why: ${job.reasons.join('; ')}`,
    ''
  ].join('\n'));

  if (acceptedJobs.length === 0) {
    body.push('No new roles cleared the relevance threshold on this run.');
  }

  return header.concat(body).join('\n');
}

const projectRoot = detectProjectRoot();
const inputPath = getArg('--input');
if (!inputPath) {
  console.error('Missing required --input path to JSON scan results.');
  process.exit(1);
}

const resolvedInput = resolve(inputPath);
if (!existsSync(resolvedInput)) {
  console.error(`Input file not found: ${resolvedInput}`);
  process.exit(1);
}

ensureDataFiles(projectRoot);

const profile = readYaml(join(projectRoot, 'config', 'profile.yml')) || {};
const portals = readYaml(join(projectRoot, 'portals.yml')) || {};
const candidates = JSON.parse(readFileSync(resolvedInput, 'utf-8'));
const jobs = Array.isArray(candidates) ? candidates : candidates.jobs || [];
const foundOn = new Date().toISOString().slice(0, 10);
const maxJobs = profile?.search_preferences?.max_jobs_per_run || 10;

const seen = buildSeenState(projectRoot);
const historyRows = [];
const acceptedJobs = [];
let duplicates = 0;
let lowScore = 0;

for (const rawJob of jobs) {
  const job = {
    title: compact(rawJob.title),
    company: compact(rawJob.company),
    url: compact(rawJob.url),
    source: compact(rawJob.source),
    location: compact(rawJob.location),
    summary: compact(rawJob.summary),
    keywords: rawJob.keywords || []
  };

  if (!job.title || !job.company || !job.url) {
    historyRows.push([foundOn, '', job.company, job.title, job.url, job.source, 'skipped_invalid', 'not_delivered'].join('\t'));
    continue;
  }

  const urlSeen = seen.seenUrls.has(job.url);
  const roleKey = lineKey(job.company, job.title);
  const keySeen = roleKey && seen.seenKeys.has(roleKey);
  if (urlSeen || keySeen) {
    duplicates += 1;
    historyRows.push([foundOn, '', job.company, job.title, job.url, job.source, 'skipped_dup', 'not_delivered'].join('\t'));
    continue;
  }

  const score = buildScore(job, profile, portals);
  if (score.decision !== 'selected') {
    lowScore += 1;
    historyRows.push([foundOn, String(score.score), job.company, job.title, job.url, job.source, score.decision, 'not_delivered'].join('\t'));
    continue;
  }

  acceptedJobs.push({
    ...job,
    foundOn,
    score: score.score,
    reasons: score.reasons
  });

  seen.seenUrls.add(job.url);
  if (roleKey) seen.seenKeys.add(roleKey);
}

acceptedJobs.sort((a, b) => b.score - a.score);
const limitedJobs = acceptedJobs.slice(0, maxJobs);
const deferredJobs = acceptedJobs.slice(maxJobs);
updatePipeline(projectRoot, limitedJobs);

const threshold = profile?.search_preferences?.minimum_relevance_score || 75;
const digest = buildDigest(limitedJobs, threshold, foundOn, { duplicates, lowScore });

for (const job of limitedJobs) {
  historyRows.push([foundOn, String(job.score), job.company, job.title, job.url, job.source, 'selected', 'openclaw-channel'].join('\t'));
}

for (const job of deferredJobs) {
  historyRows.push([foundOn, String(job.score), job.company, job.title, job.url, job.source, 'skipped_limit', 'not_delivered'].join('\t'));
}

appendHistory(projectRoot, historyRows);
console.log(digest);
