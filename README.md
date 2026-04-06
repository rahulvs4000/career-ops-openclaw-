# OpenClaw Career-Ops Skill

`career-ops` is a full OpenClaw-native port of the **career-ops** workflow, implemented as a first-class reusable skill package (no Go dashboard included). It preserves the same operational model: mode-based routing, source-of-truth onboarding, script-backed deterministic processing, and controlled application workflows for a practical job search system.

This package is designed to be installed/used as a standalone repository, not just a local hack.

## What this skill includes

This repository contains:

- `SKILL.md` — OpenClaw routing and mode definitions.
- `references/modes/*.md` — mode-level instructions and operational guidance:
  - `_shared.md`
  - `auto-pipeline.md`
  - `oferta.md`
  - `ofertas.md`
  - `contacto.md`
  - `deep.md`
  - `pdf.md`
  - `training.md`
  - `project.md`
  - `tracker.md`
  - `pipeline.md`
  - `apply.md`
  - `scan.md`
  - `batch.md`
- `references/setup.md` — onboarding and setup guidance.
- `scripts/*.mjs` deterministic utilities:
  - `cv-sync-check.mjs`
  - `generate-pdf.mjs`
  - `merge-tracker.mjs`
  - `verify-pipeline.mjs`
  - `normalize-statuses.mjs`
  - `dedup-tracker.mjs`
- `scripts/batch/` — batch runner and prompt template.
- `templates/`:
  - `cv-template.html`
  - `portals.example.yml`
  - `states.yml`
- `config/profile.example.yml` and example data/assets under `examples/`, `fonts/`, `data/`, `config/`.

## Capabilities (by mode)

Invoke via:

- `/career-ops` (menu/discovery mode)
- `/career-ops <mode>` (explicit mode)
- `/career-ops <raw JD text or job URL>` (auto-pipeline route)

Supported mode family:

- `oferta`
- `ofertas`
- `contacto`
- `deep`
- `pdf`
- `training`
- `project`
- `tracker`
- `pipeline`
- `apply`
- `scan`
- `batch`
- `auto-pipeline` (JD/url inferred route)

### Routing behavior

- If no argument is given: opens discovery mode.
- If argument equals a mode keyword: direct mode routing.
- Otherwise, if input resembles a job description or URL, route to `auto-pipeline`.
- Otherwise: show discovery/menu and ask for clarification.

### Mode behavior summary

- **oferta / ofertas**
  - JD ingestion and role evaluation workflows.
  - Offer-level structuring, fit assessment, and decision guidance.
- **contacto**
  - Contact and outreach prep guidance.
- **deep**
  - Deep analysis flows with more expansive reasoning and refinement.
- **pdf**
  - Resume/document preparation support and PDF generation support.
- **training**
  - Interview/project training preparation guidance.
- **project**
  - Project narrative and matching workflow support.
- **tracker**
  - Tracker review and deterministic operations.
- **pipeline**
  - Pipeline queue processing, status integrity checks, and handoff flow.
- **apply**
  - Controlled application workflow (review-first, not auto-submit).
- **scan**
  - Candidate/application source scanning, extraction, and updates.
- **batch**
  - Batch orchestration over tracker-like queues using `batch-runner.sh` and worker hooks.
- **auto-pipeline**
  - Converts raw JD/link input into pipeline-ready artifacts, then moves into canonical tracker/pipeline flows.

## Source-of-truth and onboarding requirements

Before doing substantive work, the skill enforces or recommends the presence of:

- `cv.md`
- `config/profile.yml`
- `portals.yml`

and required runtime data files:

- `data/applications.md`
- `data/pipeline.md`
- `data/scan-history.tsv`
- `interview-prep/story-bank.md` (optional, encouraged)
- `reports/` directory

If missing, the user is directed to follow `references/setup.md`.

## Deterministic script flow

These scripts are part of the canonical behavior and are intended to be executed for reproducible outcomes:

```bash
node scripts/cv-sync-check.mjs [--project-root .]
node scripts/normalize-statuses.mjs [--project-root .]
node scripts/dedup-tracker.mjs [--project-root .]
node scripts/merge-tracker.mjs [--project-root .]
node scripts/verify-pipeline.mjs [--project-root .]
node scripts/generate-pdf.mjs [--project-root .]
```

Batch mode uses:

```bash
scripts/batch/batch-runner.sh [--project-root .]
```

`--project-root` points the scripts to the working user project folder so the skill can run from a shared install location while acting on per-user state.

## Runtime dependencies

- Node.js
- Playwright runtime dependency (`playwright` declared in `package.json`)
- Browser runtime for any browser-backed checks (as required by workflow specifics)

Install dependencies:

```bash
npm install
```

Install browser binaries (if needed by your Playwright flow):

```bash
npx playwright install
```

## Data model and integrity rules carried from source

- Maintains report numbering conventions.
- Preserves canonical statuses from `templates/states.yml`.
- Keeps merge/dedup/verify ordering and idempotence patterns.
- Normalization and dedupe are explicit operations, not just natural-language suggestions.
- Tracker and pipeline files are treated as mutable state with controlled update semantics.

## Safety / ethics policy in behavior

The skill enforces or follows:

- No blind mass-apply behavior.
- No auto-submission without human review.
- Weak-fit filtering guidance (score-aware caution).
- Offer-quality-first decision bias.
- Browser-backed verification is used for offer/job activation checks instead of weak static-only inference where available.

## Local use and cloning

This directory is a standalone OpenClaw skill package:

```bash
git clone https://github.com/rahulvs4000/career-ops-openclaw-.git
cd career-ops-openclaw-
npm install
npx playwright install
```

Use from an OpenClaw environment configured with this skill path and invoke `/career-ops`.

## File layout

```text
├── SKILL.md
├── package.json
├── README.md
├── references/
│   ├── setup.md
│   └── modes/
├── scripts/
│   ├── *.mjs
│   └── batch/
├── templates/
├── examples/
├── fonts/
├── config/
├── data/
└── .gitkeep placeholders for expected working dirs/files
```

## Why this maps to “career-ops for OpenClaw”

This package is intentionally parity-oriented:

- Same mode set and routing model
- Same deterministic helpers and helper scripts
- Same source-of-truth checks and flow files
- Same integrity constraints and safety defaults
- No Go dashboard component included

The only changes are runtime adaptation to OpenClaw-native execution (invocation contract, script pathing, and skill metadata/gating where applicable).

