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
   - `cp {baseDir}/scripts/batch/batch-runner.sh batch/batch-runner.sh`
   - `cp {baseDir}/scripts/batch/batch-prompt.md batch/batch-prompt.md`
   - `mkdir -p batch/logs batch/tracker-additions`
2. Create base files if absent:
   - `cv.md`
   - `data/applications.md` with header + tracker rows
   - `data/pipeline.md` with `## Pendientes` and `## Procesadas`
   - `data/scan-history.tsv`
   - `batch/` directory for queue files if using batch mode
3. Install runtime dependency:

```bash
npm install
npx playwright install chromium
```

## Available `/career-ops` commands

- `auto-pipeline` via `/career-ops {url or JD}`
- `oferta`
- `ofertas`
- `contacto`
- `deep`
- `pdf`
- `training`
- `project`
- `tracker`
- `apply`
- `scan`
- `pipeline`
- `batch`

## Integrity checks

```bash
node {baseDir}/scripts/cv-sync-check.mjs --project-root .
node {baseDir}/scripts/verify-pipeline.mjs --project-root .
node {baseDir}/scripts/normalize-statuses.mjs --project-root .
node {baseDir}/scripts/dedup-tracker.mjs --project-root .
node {baseDir}/scripts/merge-tracker.mjs --project-root .
```

## Notes

- This package mirrors the original career-ops workflows.  
- `batch` execution expects a worker command configured via `CAREER_OPS_BATCH_WORKER_COMMAND` in the environment.
- For OpenClaw-native batches, point the worker command at a wrapper that invokes the desired workflow and reads:
  - `CAREER_OPS_BATCH_PROMPT_FILE`, `CAREER_OPS_BATCH_ID`, `CAREER_OPS_BATCH_URL`, `CAREER_OPS_BATCH_SOURCE`, and `CAREER_OPS_BATCH_NOTES`.
