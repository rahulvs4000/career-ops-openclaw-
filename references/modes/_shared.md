# Shared Context -- career-ops

<!-- ============================================================
     HOW TO CUSTOMIZE THIS FILE
     ============================================================
     This file contains the shared context for discovery, pipeline,
     delivery, and PDF generation.
     Before using career-ops, you MUST:
     1. Fill in config/profile.yml with your personal data
     2. Create your cv.md in the project root
     3. Copy templates/portals.example.yml to portals.yml and edit it
     4. (Optional) Create article-digest.md with fresher proof points
     ============================================================ -->

## Sources of Truth

| File | Path | When |
|------|------|------|
| cv.md | `cv.md` | PDF generation |
| article-digest.md | `article-digest.md` (if exists) | PDF generation and proof-point refresh |
| profile.yml | `config/profile.yml` | Identity, target roles, scoring preferences, narrative, location |
| portals.yml | `portals.yml` | Search sources, tracked companies, title filters |

**RULE: NEVER hardcode metrics from proof points.**
Read them from `cv.md` and `article-digest.md` at runtime.

**RULE: If `article-digest.md` has newer detail than `cv.md`, prefer it.**

## Target Search Profile

Use `config/profile.yml` as the main source for:

- target roles
- public identity
- scoring and relevance thresholds
- preferred companies and keywords
- location and work authorization context
- portfolio and demo links

Use the active OpenClaw session as the source of truth for which outbound user channel is available.

## Shared Operating Rules

### NEVER

1. Invent experience, metrics, or credentials
2. Modify `cv.md` automatically
3. Claim a private or login-gated page was read if it was not
4. Auto-submit anything on the user's behalf
5. Create duplicate tracker or pipeline entries when an existing record should be updated
6. Send the same role twice when it already exists in history, pipeline, or tracker

### ALWAYS

1. Read the relevant source files before generating a PDF or updating search data
2. Run `node scripts/cv-sync-check.mjs --project-root .` before substantial PDF work
3. Prefer browser-backed extraction for dynamic career sites
4. Keep pipeline and tracker records deduplicated
5. Use concise, direct language in generated content
6. Keep case-study URLs and portfolio links prominent when they strengthen the PDF
7. For scan flows, run the deterministic post-processing script so scoring, dedup, persistence, and delivery selection all happen the same way every time
8. Deliver the scan digest through the already-configured OpenClaw channel instead of maintaining a second notification system inside the skill

### Tools

| Tool | Use |
|------|-----|
| WebFetch | Static job pages and simple company pages |
| Playwright | Dynamic career sites, job-active checks, browser-backed extraction |
| Read | `cv.md`, `article-digest.md`, `config/profile.yml`, `portals.yml`, `cv-template.html` |
| Write | Temporary HTML for PDF, tracker and pipeline files, temporary scan JSON |
| Edit | Update tracker and pipeline entries |
| Bash | `node generate-pdf.mjs`, sync and integrity scripts, `node scripts/process-scan-results.mjs` |
