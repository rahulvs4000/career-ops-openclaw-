# Career-Ops for OpenClaw

## Installation

Run:

```bash
npm install
npx playwright install chromium
```

This installs:

- `playwright` for browser-based job discovery on dynamic career sites
- `yaml` for reading the skill's configuration files

## What this skill does

`career-ops` is an OpenClaw skill for running a disciplined job search.

It does two things:

- finds relevant openings from the sources you care about
- tracks what was found, what was surfaced, and what happened next

This repository is a standalone OpenClaw skill package. It is meant to be shared and installed as a reusable skill, not kept as a local one-off workflow.

## 1. Find relevant jobs

The skill searches in a focused way rather than pulling in every job it can find.

Out of the box, it looks across sources such as:

- Ashby
- Greenhouse
- Lever
- Wellfound
- Workable
- RemoteFront

It also includes a built-in company watchlist aimed at AI, automation, solutions, forward-deployed, and related roles. That list lives in `portals.yml` and can be changed to match your own search.

By default, it looks for roles such as:

- AI Product Manager
- Solutions Architect
- Solutions Engineer
- Forward Deployed Engineer
- AI Engineer
- LLM Engineer
- agentic and automation roles
- voice AI and conversational AI roles
- GTM and business-systems automation roles

It filters out obvious noise like junior roles, internships, mobile roles, crypto/Web3, and unrelated stacks.

Searches only run when you ask for them, usually with `/career-ops scan`. There is no silent background polling.

Every scan run:

- checks the enabled search queries in `portals.yml`
- checks the enabled tracked companies in `portals.yml`
- scores the results against your preferences in `config/profile.yml`
- removes duplicates before anything is surfaced
- returns only the new roles that clear your relevance threshold

The relevance check is driven by your saved settings, including:

- target roles
- preferred companies
- priority keywords
- preferred locations
- excluded locations
- the minimum relevance score required to surface a role

That means the skill is not just finding jobs. It is deciding which jobs are worth surfacing to you.

### Where to add company career pages

Add them in `portals.yml` under `tracked_companies`.

Each enabled entry in that list is part of the scan run. For example:

```yml
tracked_companies:
  - name: Example AI
    careers_url: https://example.com/careers
    enabled: true

  - name: Another Co
    careers_url: https://jobs.example.org
    scan_method: websearch
    scan_query: 'site:jobs.example.org "AI Engineer" OR "Solutions Architect"'
    enabled: true
```

If you have a large list, that is fine. The scan is now designed so those URLs are processed by a deterministic script with limited concurrency instead of being stuffed into model context.

### How the scan works at scale

The scalable scan flow is now split into two stages:

1. `scan-sources.mjs`
- reads `search_queries` and `tracked_companies`
- scans them in batches with a concurrency limit
- uses Greenhouse APIs where available
- uses Playwright for dynamic career pages
- uses web search for entries configured with `scan_method: websearch`
- writes a normalized candidate file

2. `process-scan-results.mjs`
- scores all candidates against your profile
- deduplicates against scan history, pipeline, and tracker
- drops low-score results
- writes only the new relevant roles into the pipeline
- returns the final digest

So even if you have a very large company list, the model should only see the reduced candidate set, not all of the raw pages.

### How you customize discovery

Edit `portals.yml` to control where the skill looks:

- `search_queries` controls the broad search coverage
- `tracked_companies` controls which company career pages are checked directly
- `title_filter` controls positive and negative title matching

Edit `config/profile.yml` to control what counts as a good result:

- `target_roles`
- `search_preferences.minimum_relevance_score`
- `search_preferences.preferred_companies`
- `search_preferences.priority_keywords`
- `search_preferences.preferred_locations`
- `search_preferences.exclude_locations`
- `search_preferences.max_jobs_per_run`

If you want the skill to keep checking a specific company, add that company to `tracked_companies` with its careers URL.

If a page is login-gated or private, the skill does not fake access. It marks that clearly instead of pretending the job was checked.

## 2. Track opportunities and pipeline status

The skill keeps the search organized as an operating system, not a pile of links.

It maintains three working files:

- `data/pipeline.md` for roles that have been surfaced and need follow-up
- `data/applications.md` for tracking application status over time
- `data/scan-history.tsv` for the full audit trail of what each scan found

When a role clears the threshold, it is written into `data/pipeline.md` with:

- the date it was found
- the relevance score that surfaced it
- company
- role title
- URL
- source

`data/scan-history.tsv` is the long-term memory for the system. It records whether a result was:

- surfaced
- skipped as a duplicate
- skipped for low score
- skipped because the title or location was not a fit

This is what keeps repeated runs clean. The skill deduplicates against:

- prior scan history
- the current pipeline
- the applications tracker

So if you run it regularly, the same role should not keep getting surfaced again.

## Delivery model

This skill does not maintain its own Telegram, email, Slack, or webhook system.

Instead, it prepares a final digest of new high-relevance roles and expects OpenClaw to deliver that digest through whatever user channel is already configured in the host runtime.

The flow is:

1. scan the configured sources
2. score the results
3. remove duplicates
4. keep only roles above threshold
5. save them into local state
6. return a digest
7. let OpenClaw deliver that digest through the active user channel

So the skill is responsible for deciding what is worth surfacing. OpenClaw is responsible for how that message reaches the user.

## What you need to set up

Create or copy these files before using the skill:

- `config/profile.yml`
- `portals.yml`
- `data/pipeline.md`
- `data/applications.md`
- `data/scan-history.tsv`

The repo already includes examples for the config and portal files.

## How to use it

Typical usage looks like this:

1. Run `/career-ops scan`
2. Receive a digest of new high-relevance roles
3. Review the surfaced jobs in your OpenClaw channel
4. Use `data/pipeline.md` and `data/applications.md` as the persistent state behind that digest
5. Update tracker status as you move from review to application to response to interview

For very large source lists, the underlying scalable version of the same flow is:

```bash
node scripts/scan-sources.mjs --project-root . --output ./data/scan-candidates.json
node scripts/process-scan-results.mjs --project-root . --input ./data/scan-candidates.json
```

You can also pass `--concurrency 5` or another value to tune how many company pages are scanned in parallel.

You can also paste one or more job URLs directly into `/career-ops`, and the skill will route them into the pipeline workflow instead of treating them as a broad scan.

## Guardrails

This skill is intentionally conservative.

It is designed to:

- avoid pretending a private page was read when it was not
- avoid surfacing duplicates
- avoid flooding you with weak-fit jobs
- keep search history auditable
- rely on browser-backed extraction when dynamic job pages require it

## What is included in this repository

This repository includes:

- the OpenClaw skill definition
- the mode instructions
- the setup guide
- the deterministic support scripts
- the portal and state templates
- the example profile config

## Who this is for

This package is a good fit for:

- individual job seekers who want a disciplined search system
- operators helping someone run a high-touch search
- people targeting AI, solutions, automation, or forward-deployed roles
- anyone who wants a repeatable search-and-tracking workflow instead of scattered prompts
