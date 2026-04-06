---
name: career-ops
description: AI job search command center for JD evaluation, tracker operations, CV/cover letter PDF generation, portal scanning, and batch workflows.
user-invocable: true
metadata: { "openclaw": { "emoji": "CO", "requires": { "bins": ["node"] }, "install": [ { "id": "node-playwright", "kind": "node", "package": "playwright", "label": "Install Playwright runtime dependency (npm/yarn/pnpm/bun)" } ] } }
---

# career-ops

Use as `/career-ops` with optional trailing arguments.

Mode routing:

- No argument / empty argument ⇒ `discovery`
- A single token matching a mode keyword ⇒ route to that mode
- If argument is not a mode and looks like a JD or job URL ⇒ `auto-pipeline`
- Otherwise show discovery and ask for clarification

Mode keywords:

`oferta`, `ofertas`, `contacto`, `deep`, `pdf`, `training`, `project`,
`tracker`, `pipeline`, `apply`, `scan`, `batch`

## Auto-pipeline detection

If input is not a mode keyword and contains:

- URL pattern (`https://...` / `http://...`)
- or JD-like content (`responsibilities`, `requirements`, `qualifications`, `about the role`, title + company language)

treat as `auto-pipeline`.

## Context loading by mode

- Shared mode files: load `[modes/_shared.md](references/modes/_shared.md)` plus `[mode.md](references/modes/{mode}.md)`.
  Applies to: `auto-pipeline`, `oferta`, `ofertas`, `pdf`, `contacto`, `apply`, `pipeline`, `scan`, `batch`.
- Standalone mode files only: load `[mode.md](references/modes/{mode}.md)`.
  Applies to: `tracker`, `deep`, `training`, `project`.

## Discovery / command menu

- `/career-ops` or no args: show the command menu.
- `/career-ops pipeline` → backlog processing from `data/pipeline.md`.
- `/career-ops oferta` / `/career-ops ofertas` / `/career-ops contacto` / `/career-ops deep` / `/career-ops pdf` / `/career-ops training` / `/career-ops project` / `/career-ops tracker` / `/career-ops apply` / `/career-ops scan` / `/career-ops batch`.
- `/career-ops {JD text or URL}` → `auto-pipeline`.

## Onboarding (required source-of-truth checks)

Before doing substantive work, verify the required files exist:

- `cv.md`
- `config/profile.yml`
- `portals.yml`

If any are missing, instruct the user to run setup steps in `references/setup.md` and stop further action.

Also keep these required flow files in place before tracker/report flows:

- `data/applications.md` (create if missing)
- `data/pipeline.md` (create if missing)
- `data/scan-history.tsv` (create if missing)
- `interview-prep/story-bank.md` (optional)
- `reports/` (create if missing)

## Script-backed deterministic operations

When the user asks for scripted checks, run directly from this folder:

- `{baseDir}/scripts/cv-sync-check.mjs`
- `{baseDir}/scripts/generate-pdf.mjs`
- `{baseDir}/scripts/merge-tracker.mjs`
- `{baseDir}/scripts/verify-pipeline.mjs`
- `{baseDir}/scripts/normalize-statuses.mjs`
- `{baseDir}/scripts/dedup-tracker.mjs`

When `batch` mode is used and orchestration requires external worker command, use:

- `{baseDir}/scripts/batch/batch-runner.sh`

If the worker hook is not configured, report that batch auto-processing is paused until configured and continue with queue/state management.

## Safety and ethics to enforce

- No auto-submit behavior.
- Discourage weak-fit applications (score < 3.0 / 3.5 depending on mode context).
- No blind mass apply; prefer high-confidence opportunities.
- Always prioritize offer quality and fit.
- Offer verification logic must use browser-backed extraction when checking job-active state (no static assumptions).

## Script/runtime conventions

- Preserve existing mode names and report numbering rules.
- Preserve canonical status rules from `templates/states.yml`.
- Preserve tracker merge/dedup/verification flows by mode.
- If Playwright is unavailable, report limits clearly and use fallback extraction paths only when safe.



