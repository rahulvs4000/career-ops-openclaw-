# Shared Context -- career-ops

<!-- ============================================================
     HOW TO CUSTOMIZE THIS FILE
     ============================================================
     This file contains the shared context for discovery, pipeline,
     and delivery.
     Before using career-ops, you MUST:
     1. Fill in config/profile.yml with your personal data
     2. Copy templates/portals.example.yml to portals.yml and edit it
     ============================================================ -->

## Sources of Truth

| File | Path | When |
|------|------|------|
| profile.yml | `config/profile.yml` | Identity, target roles, scoring preferences, narrative, location |
| portals.yml | `portals.yml` | Search sources, tracked companies, title filters |

## Target Search Profile

Use `config/profile.yml` as the main source for:

- target roles
- public identity
- scoring and relevance thresholds
- preferred companies and keywords
- location and work authorization context

Use the active OpenClaw session as the source of truth for which outbound user channel is available.

## Shared Operating Rules

### NEVER

1. Invent credentials or unavailable access
2. Claim a private or login-gated page was read if it was not
3. Auto-submit anything on the user's behalf
4. Create duplicate tracker or pipeline entries when an existing record should be updated
5. Send the same role twice when it already exists in history, pipeline, or tracker

### ALWAYS

1. Read the relevant source files before updating search data
2. Prefer browser-backed extraction for dynamic career sites
3. Keep pipeline and tracker records deduplicated
4. Use concise, direct language in generated content
5. For scan flows, run the deterministic post-processing script so scoring, dedup, persistence, and delivery selection all happen the same way every time
6. Deliver the scan digest through the already-configured OpenClaw channel instead of maintaining a second notification system inside the skill

### Tools

| Tool | Use |
|------|-----|
| WebFetch | Static job pages and simple company pages |
| Playwright | Dynamic career sites, job-active checks, browser-backed extraction |
| Read | `config/profile.yml`, `portals.yml` |
| Write | Tracker and pipeline files, temporary scan JSON |
| Edit | Update tracker and pipeline entries |
| Bash | Integrity scripts and `node scripts/process-scan-results.mjs` |
