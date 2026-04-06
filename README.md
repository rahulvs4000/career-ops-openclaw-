# Career-Ops for OpenClaw

## Installation

Run:

```bash
npm install
npx playwright install chromium
```

This installs the runtime dependencies used by the skill:

- `playwright` for browser-based job-page extraction and PDF rendering
- `yaml` for reading the skill's YAML config files

`career-ops` is an OpenClaw skill for managing the job search process end to end.

It helps you:

- find relevant jobs
- generate CV and supporting PDFs
- track opportunities and pipeline status

This repository is the standalone skill package. It is meant to be shared, installed, and reused as a productized OpenClaw skill.

## What this skill is for

Use this skill when you want a structured job-search assistant that behaves consistently from one role to the next.

It is built for people who want:

- fewer random one-off job applications
- more deliberate job search operations
- repeatable tracking and status management
- a clear process for CV updates and PDF generation
- script-backed reliability instead of ad hoc manual steps

It is not a generic chat prompt. It is a workflow package with named modes, shared rules, and deterministic helper scripts.

## 1. Find relevant jobs

The skill searches in a focused way, not by scraping the whole internet blindly.

Out of the box, it looks across public sources such as:

- Ashby
- Greenhouse
- Lever
- Wellfound
- Workable
- RemoteFront

It also ships with a built-in company watchlist aimed at AI, automation, solutions, forward-deployed, and AI product roles. That list includes companies such as OpenAI, Anthropic, PolyAI, ElevenLabs, Deepgram, Retool, Airtable, Vercel, Arize AI, Cohere, LangChain, Pinecone, Mistral AI, Palantir, n8n, Zapier, and others defined in `portals.yml`.

By default, it searches for titles such as:

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

Searches only run when you ask for them, typically with `/career-ops scan`. There is no silent background scanning. Each run checks:

- enabled built-in search queries
- enabled tracked companies
- any companies or queries you added yourself

The scan does not surface every match. It runs a relevance pass first and only keeps openings that clear your configured threshold. That threshold comes from your profile settings, not from hardcoded guesswork.

The current relevance check combines:

- your target roles in `config/profile.yml`
- your preferred companies
- your priority keywords
- your location preferences
- the positive and negative title filters in `portals.yml`
- seniority signals such as Senior, Staff, Principal, or Lead

This is what decides whether a role is good enough to be surfaced. Roles below the threshold are recorded in scan history but are not delivered.

To customize job discovery, edit:

- `portals.yml` to add or remove search queries, tracked companies, and title filters
- `config/profile.yml` to change your target roles, preferred companies, priority keywords, locations, threshold, and max jobs per run

If you want a specific company site checked every time, add it to `tracked_companies` with its careers URL. If it has a public Greenhouse API, the skill can use that too. If the page is behind login or SSO, the skill does not fake access. It falls back to a manual path: paste the JD, provide screenshots, or use a logged-in browser session.

Duplicates are not delivered. Every run deduplicates against:

- prior scan history
- the current pipeline
- the applications tracker

That means if you run the flow regularly, the same role should not be pushed again unless you deliberately change your state files.

The skill itself does not define its own Telegram, email, or webhook system anymore. It prepares the final digest, and OpenClaw should deliver that digest through whichever channel is already configured for the user session.

## 2. Generate CV and supporting PDFs

The skill treats your materials as source-of-truth inputs, not as disposable text. It reads:

- `cv.md` as the baseline record of your experience
- `config/profile.yml` as the record of your identity, target roles, narrative, and location context
- `article-digest.md`, if you use it, as a richer source of proof points and fresher metrics

That means users can change how the skill reads and presents them by editing those files. In particular, `config/profile.yml` is where you change:

- your public profile details
- your target role direction
- your headline and transition story
- your proof points
- your work-authorization and location context

If you want a role-targeted PDF, give the skill a job post or a clear company-and-role brief. It can then:

- extract keywords from the role context
- rewrite the professional summary
- reorder experience bullets by relevance
- choose the most relevant projects
- generate a polished PDF for the application

If you do not provide role context, it can still generate a clean general-purpose CV PDF from your saved profile and resume data.

It does not invent experience or metrics. If both `cv.md` and `article-digest.md` mention the same proof point, the richer or newer detail from `article-digest.md` is preferred.

The output is a real `.pdf` file rendered from HTML through Playwright/Chromium. It is designed to stay ATS-friendly and uses `letter` for US/Canada and `a4` elsewhere.

## 3. Track opportunities and pipeline status

The skill keeps the search organized as an operating system, not a pile of notes.

It maintains:

- a pipeline of roles to process
- an applications tracker
- scan history so the same jobs are not rediscovered endlessly
- generated outputs tied to tracked opportunities

It also runs cleanup and integrity rules so the system stays usable over time:

- deduplicate repeated entries
- normalize statuses
- verify pipeline consistency
- update existing records instead of multiplying duplicates

New high-relevance roles are written into `data/pipeline.md` with the date they were found and the score that caused them to pass the threshold. `data/scan-history.tsv` keeps the full audit trail, including duplicates and low-score roles that were suppressed.

A typical pipeline entry now includes:

- found date
- relevance score
- company
- role title
- URL
- source

That gives you both a working queue and a record of when the opportunity first appeared.

## Delivery and notifications

This skill now assumes channel delivery is handled by OpenClaw itself.

The flow is:

1. scan sources
2. score the results
3. drop duplicates
4. keep only roles above threshold
5. save those roles in local state
6. return a digest
7. let OpenClaw send that digest through the user's configured channel

So the skill package is responsible for choosing what is worth surfacing. OpenClaw is responsible for how that message reaches the user.

## What users need

Most users need only:

- `portals.yml`
- `cv.md`
- `config/profile.yml`
- the tracker and pipeline files used by the workflow
- Playwright/browser support for dynamic job pages and PDF generation

There is no required API key for normal scanning, pipeline management, tracker management, or PDF generation.

Optional credentials matter only in a few cases:

- a logged-in browser session for login-gated pages
- whatever OpenClaw channel credentials are already required by the host deployment
- demo credentials if you want to share a private demo inside your CV or portfolio links

## Guardrails

This skill is intentionally conservative in the places that matter.

It is designed to:

- avoid pretending a private page was read when it was not
- avoid auto-submitting anything on your behalf
- keep search data deduplicated and auditable
- surface only roles that clear the configured relevance threshold
- verify live job state with browser-backed checks where possible
- keep generated documents anchored to your real source material

That is a product choice, not an implementation detail.

## What is included in this repository

This repository includes the full packaged skill:

- the OpenClaw skill definition
- the mode instructions
- the setup guide
- the deterministic support scripts
- the templates used for document and state handling
- example profile config files
- the assets needed for polished PDF output

## Who this is for

This package is a good fit for:

- individual job seekers who want a disciplined system
- operators helping someone manage a high-touch search
- people targeting AI, solutions, automation, or forward-deployed roles
- anyone who wants one reusable workflow instead of dozens of scattered prompts

It is especially useful when the search is selective and high-value, not mass-market.
