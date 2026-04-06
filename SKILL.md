---
name: career-ops
description: AI job search command center for focused job discovery, relevance scoring, deduplicated delivery through OpenClaw-configured channels, and pipeline and tracker operations.
user-invocable: true
metadata: { "openclaw": { "emoji": "CO", "requires": { "bins": ["node"] }, "install": [ { "id": "node-playwright", "kind": "node", "package": "playwright", "label": "Install Playwright runtime dependency (npm/yarn/pnpm/bun)" } ] } }
---

# career-ops

Use as `/career-ops` with optional trailing arguments.

Mode routing:

- No argument / empty argument => `discovery`
- A single token matching a mode keyword => route to that mode
- If argument is not a mode and looks like one or more job URLs => `pipeline`
- Otherwise show discovery and ask for clarification

Mode keywords:

`training`, `project`, `tracker`, `pipeline`, `scan`

## Pipeline intake detection

If input is not a mode keyword and contains one or more URLs that look like job postings or career pages:

- route to `pipeline`
- treat the URLs as pending items to verify and organize
- do not evaluate fit or generate application answers inline

## Context loading by mode

- Shared mode files: load `[modes/_shared.md](references/modes/_shared.md)` plus `[mode.md](references/modes/{mode}.md)`.
  Applies to: `pipeline`, `scan`.
- Standalone mode files only: load `[mode.md](references/modes/{mode}.md)`.
  Applies to: `tracker`, `training`, `project`.

## Discovery / command menu

- `/career-ops` or no args: show the command menu.
- `/career-ops scan` => discover roles, score them, deduplicate them, save them, and surface only the new high-relevance ones through the active OpenClaw channel.
- `/career-ops pipeline` => verify, normalize, and organize pending job URLs in `data/pipeline.md`.
- `/career-ops tracker` => read and update `data/applications.md`.
- `/career-ops training` / `/career-ops project`.
- `/career-ops {job URL or list of job URLs}` => add them to `pipeline`.

## Onboarding (required source-of-truth checks)

Before doing substantive work, verify the required files for the selected mode exist:

- `scan`: `portals.yml`, `config/profile.yml`, `data/pipeline.md`, `data/scan-history.tsv`
- `pipeline`: `data/pipeline.md`, `data/applications.md`
- `tracker`: `data/applications.md`

If any required file is missing, instruct the user to run setup steps in `references/setup.md` and stop further action.

Also support these optional shared files when present:

- `reports/`

## Script-backed deterministic operations

When the user asks for scripted checks, run directly from this folder:

- `{baseDir}/scripts/process-scan-results.mjs`
- `{baseDir}/scripts/merge-tracker.mjs`
- `{baseDir}/scripts/verify-pipeline.mjs`
- `{baseDir}/scripts/normalize-statuses.mjs`
- `{baseDir}/scripts/dedup-tracker.mjs`

## Safety and ethics to enforce

- No auto-submit behavior.
- Never claim a login-gated or private job page was read when it was not.
- Preserve canonical status rules from `templates/states.yml`.
- Use browser-backed extraction when verifying dynamic career pages or job-active state.
- Never surface duplicates through outbound channels.
- Only surface roles that meet or exceed the configured relevance threshold.

## Script/runtime conventions

- Preserve tracker merge, dedup, and verification flows.
- Preserve `found_on`, score, and delivery status in scan history.
- After `process-scan-results.mjs` returns a digest, send that digest through the OpenClaw channel already configured for the user session instead of using a separate notification config in this skill.
- If Playwright is unavailable, report limits clearly and use fallback extraction paths only when safe.
