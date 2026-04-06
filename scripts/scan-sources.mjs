#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { chromium } from 'playwright';

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

function getArg(flag, fallback) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(flag);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return fallback;
}

function readYaml(path) {
  if (!existsSync(path)) return null;
  return YAML.parse(readFileSync(path, 'utf-8'));
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripTags(value) {
  return normalizeWhitespace(String(value || '').replace(/<[^>]+>/g, ' '));
}

function absoluteUrl(candidate, base) {
  try {
    return new URL(candidate, base).toString();
  } catch {
    return '';
  }
}

function looksLikeJobUrl(url) {
  return /(job|jobs|career|careers|position|opening|openings|greenhouse|ashby|lever|workable|wellfound)/i.test(url);
}

function looksLikeJobText(text) {
  return /(engineer|architect|manager|product|developer|scientist|ai|ml|llm|solution|forward deployed|automation|platform|agent)/i.test(text);
}

function slug(value) {
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function dedupJobs(jobs) {
  const seen = new Set();
  const output = [];
  for (const job of jobs) {
    const key = `${job.url}::${job.company}::${job.title}`.toLowerCase();
    if (!job.url || !job.company || !job.title || seen.has(key)) continue;
    seen.add(key);
    output.push(job);
  }
  return output;
}

function extractSearchResults(html, sourceLabel) {
  const results = [];
  const regex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gims;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = absoluteUrl(match[1], 'https://duckduckgo.com');
    const title = stripTags(match[2]);
    if (!url || !title) continue;
    results.push({
      title,
      company: inferCompanyFromTitle(title),
      url,
      source: sourceLabel,
      location: '',
      summary: ''
    });
  }
  return results;
}

function inferCompanyFromTitle(title) {
  if (title.includes(' @ ')) return normalizeWhitespace(title.split(' @ ').slice(1).join(' @ '));
  if (title.includes(' | ')) return normalizeWhitespace(title.split(' | ').slice(1).join(' | '));
  if (title.includes(' - ')) return normalizeWhitespace(title.split(' - ').slice(-1)[0]);
  return 'Unknown';
}

async function fetchSearchQuery(query, name) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'career-ops-scan/1.0' } });
  if (!response.ok) return [];
  const html = await response.text();
  return extractSearchResults(html, name || query);
}

async function fetchGreenhouseApi(apiUrl, companyName) {
  const response = await fetch(apiUrl, { headers: { 'User-Agent': 'career-ops-scan/1.0' } });
  if (!response.ok) return [];
  const data = await response.json();
  const jobs = Array.isArray(data?.jobs) ? data.jobs : Array.isArray(data) ? data : [];
  return jobs.map(job => ({
    title: normalizeWhitespace(job.title),
    company: companyName,
    url: job.absolute_url || job.url || '',
    source: `${companyName} API`,
    location: normalizeWhitespace(job.location?.name || job.location || ''),
    summary: normalizeWhitespace(job.content || '')
  }));
}

async function fetchCareersPage(page, company) {
  await page.goto(company.careers_url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500);
  const jobs = await page.evaluate((companyName) => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    const seen = new Set();
    const out = [];
    for (const anchor of anchors) {
      const href = anchor.href || '';
      const text = (anchor.innerText || anchor.textContent || '').replace(/\s+/g, ' ').trim();
      if (!href || !text) continue;
      if (!/(job|jobs|career|careers|position|opening|openings|greenhouse|ashby|lever|workable|wellfound)/i.test(href) && !/(engineer|architect|manager|product|developer|scientist|ai|ml|llm|solution|forward deployed|automation|platform|agent)/i.test(text)) continue;
      const key = `${href}::${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        title: text,
        company: companyName,
        url: href,
        source: `${companyName} careers`,
        location: '',
        summary: ''
      });
    }
    return out;
  }, company.name);
  return jobs;
}

async function scanTrackedCompany(browser, company) {
  if (company.enabled === false) return [];
  if (company.api) return fetchGreenhouseApi(company.api, company.name);
  if (company.scan_method === 'websearch' && company.scan_query) return fetchSearchQuery(company.scan_query, company.name);
  const page = await browser.newPage();
  try {
    return await fetchCareersPage(page, company);
  } catch {
    return [];
  } finally {
    await page.close();
  }
}

async function runWithConcurrency(items, limit, worker) {
  const results = [];
  let index = 0;
  async function next() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, () => next());
  await Promise.all(workers);
  return results.flat();
}

const projectRoot = detectProjectRoot();
const outputPath = resolve(getArg('--output', join(projectRoot, 'data', 'scan-candidates.json')));
const concurrency = Number(getArg('--concurrency', '5')) || 5;
const portals = readYaml(join(projectRoot, 'portals.yml'));

if (!portals) {
  console.error('Missing portals.yml');
  process.exit(1);
}

const searchQueries = (portals.search_queries || []).filter(item => item && item.enabled !== false);
const trackedCompanies = (portals.tracked_companies || []).filter(item => item && item.enabled !== false);

const browser = await chromium.launch({ headless: true });
let jobs = [];
try {
  const searchResults = await runWithConcurrency(searchQueries, concurrency, async (query) => fetchSearchQuery(query.query, query.name));
  const companyResults = await runWithConcurrency(trackedCompanies, concurrency, async (company) => scanTrackedCompany(browser, company));
  jobs = dedupJobs(searchResults.concat(companyResults).filter(job => looksLikeJobUrl(job.url) || looksLikeJobText(job.title)));
} finally {
  await browser.close();
}

const outputDir = dirname(outputPath);
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, JSON.stringify({ generated_at: new Date().toISOString(), count: jobs.length, jobs }, null, 2));

console.log(`Scanned ${searchQueries.length} queries and ${trackedCompanies.length} tracked companies.`);
console.log(`Wrote ${jobs.length} normalized candidates to ${outputPath}`);
