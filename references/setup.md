# Setup for career-ops (OpenClaw-native)

## Prerequisites

- Node.js 18+
- Playwright browser binaries (`npx playwright install chromium`)
- OpenClaw with this skill loaded (`skills/career-ops`)

## Quick setup

1. Copy/craft required files in your workspace:
   - `cp {baseDir}/config/profile.example.yml config/profile.yml`
   - `cp {baseDir}/templates/portals.example.yml portals.yml`
   - `cp -r {baseDir}/templates .` is optional when you also copy `cv-template.html`.
2. Create base files if absent:
   - `cv.md`
   - `data/applications.md` with header + tracker rows
   - `data/pipeline.md` with `## Pendientes` and `## Procesadas`
   - `data/scan-history.tsv` with a header row: `found_on\tscore\tcompany\trole\turl\tsource\tdecision\tdelivery`
3. Install runtime dependency:

```bash
npm install
npx playwright install chromium
```

## Available `/career-ops` commands

- `pdf`
- `training`
- `project`
- `tracker`
- `scan`
- `pipeline`
- pipeline intake via `/career-ops {job URL or list of job URLs}`

## Integrity checks

```bash
node {baseDir}/scripts/cv-sync-check.mjs --project-root .
node {baseDir}/scripts/process-scan-results.mjs --project-root . --input ./tmp-scan-results.json
node {baseDir}/scripts/verify-pipeline.mjs --project-root .
node {baseDir}/scripts/normalize-statuses.mjs --project-root .
node {baseDir}/scripts/dedup-tracker.mjs --project-root .
node {baseDir}/scripts/merge-tracker.mjs --project-root .
```

## Notes

- This package is focused on discovery, deduplicated delivery, tracking, and PDF generation.
- `scan` should surface only new roles above the configured relevance threshold.
- The skill should use the user's already-configured OpenClaw channel for delivery instead of maintaining separate webhook or SMTP settings here.
