# Career-Ops for OpenClaw

`career-ops` is an OpenClaw skill for managing the job search process end to end.

It helps you:

- find relevant jobs
- review a job description
- judge fit before applying
- prepare application materials
- generate CV and supporting PDFs
- track opportunities and pipeline status
- run batch workflows over many roles

This repository is the standalone skill package. It is meant to be shared, installed, and reused as a productized OpenClaw skill.

## What this skill is for

Use this skill when you want a structured job-search assistant that behaves consistently from one role to the next.

It is built for people who want:

- fewer random one-off job applications
- more deliberate application decisions
- repeatable tracking and status management
- a clear process for CV and pipeline updates
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

After each scan, the skill reports what happened: how many queries ran, how many jobs were found, how many were filtered out, how many were duplicates, and how many were added to the pipeline. If nothing relevant was found, the summary makes that explicit.

To customize job discovery, edit `portals.yml`:

- `search_queries` to add or remove broad searches
- `tracked_companies` to add your own target companies
- `title_filter` to tighten or widen what counts as relevant

If you want a specific company site checked every time, add it to `tracked_companies` with its careers URL. If it has a public Greenhouse API, the skill can use that too. If the page is behind login or SSO, the skill does not fake access. It falls back to a manual path: paste the JD, provide screenshots, or use a logged-in browser session.

## 2. Review a job description

When you paste a job post, a job URL, or raw JD text, the skill turns it into a structured review.

It can:

- extract the JD from the page
- summarize the role clearly
- identify requirements and signals that matter
- pull out the parts of the job worth responding to directly

For public pages, it prefers browser-based reading because many job sites are dynamic. If the page is simple, it can use lighter retrieval. If the page is inaccessible, it asks for the JD manually instead of pretending it read it.

## 3. Judge fit before applying

This skill is built to help users decide whether a role is worth pursuing before spending time on it.

It compares the role against your actual background, then produces a role-specific evaluation. That evaluation feeds the next steps: whether to ignore the role, track it, prepare materials, or move toward application.

This is where the workflow stays intentionally selective:

- it prefers strong-fit roles over high volume
- it discourages weak-fit applications
- it uses the same evaluation logic each time so decisions stay consistent

## 4. Prepare application materials

Once a role looks worthwhile, the skill helps with application prep.

That includes:

- role-specific application context
- draft answers for common form questions
- support for live application sessions
- reuse of earlier report context when the same role is already in the system

In live apply mode, it can read the current form, identify the company and role, and generate answers for visible questions like:

- why this role
- why this company
- relevant achievement
- work authorization
- salary expectations
- how you heard about the role

If the role on screen does not match the role previously evaluated, it flags that and asks whether to adapt or re-evaluate.

## 5. Generate CV and supporting PDFs

The skill treats your materials as source-of-truth inputs, not as disposable text.

It reads:

- `cv.md` as the baseline record of your experience
- `config/profile.yml` as the record of your identity, target roles, narrative, compensation, and location context
- `article-digest.md`, if you use it, as a richer source of proof points and fresher metrics

That means users can customize how the skill reads and presents them by editing those files. In particular, `config/profile.yml` is where you change:

- your public profile details
- your target role direction
- your headline and transition story
- your proof points
- your compensation range
- your work-authorization and location context

For tailored output, the skill can:

- extract keywords from the JD
- rewrite the professional summary
- reorder experience bullets by relevance
- choose the most relevant projects
- generate a polished PDF for the application

It does not invent experience or metrics. If both `cv.md` and `article-digest.md` mention the same proof point, the richer or newer detail from `article-digest.md` is preferred.

## 6. Track opportunities and pipeline status

The skill keeps the search organized as an operating system, not a pile of notes.

It maintains:

- a pipeline of roles to process
- an applications tracker
- scan history so the same jobs are not rediscovered endlessly
- reports for evaluated opportunities
- generated outputs tied to those opportunities

It also runs cleanup and integrity rules so the system stays usable over time:

- deduplicate repeated entries
- normalize statuses
- merge batch additions cleanly
- verify pipeline consistency
- update existing records instead of multiplying duplicates

This is what makes repeated use practical.

## 7. Run batch workflows over many roles

The skill can also process larger queues in batch mode.

This is for cases where you already have a prepared list of opportunities or want to work through a large set systematically.

Batch mode is designed to:

- evaluate many roles through the same core workflow
- generate reports and outputs per role
- create tracker additions safely
- merge the results back into the main system after processing

If a role fails because the JD is inaccessible, login-gated, or the page layout breaks, the batch flow records the failure and keeps going instead of collapsing the whole run.

## What users need

Most users need only:

- `cv.md`
- `config/profile.yml`
- `portals.yml`
- the tracker and pipeline files used by the workflow
- Playwright/browser support for live job pages

There is no required API key for normal scanning, evaluation, tracker management, or PDF generation.

Optional credentials matter only in a few cases:

- a logged-in browser session for login-gated pages
- demo credentials if you want to share a private demo in applications
- a configured batch worker command if you want fully automated batch execution

## Guardrails

This skill is intentionally conservative in the places that matter.

It is designed to:

- avoid blind mass application behavior
- avoid auto-submitting forms on your behalf
- discourage weak-fit opportunities
- prefer strong, explainable matches over volume
- verify live job state with browser-backed checks where possible

That is a product choice, not an implementation detail.

## What is included in this repository

This repository includes the full packaged skill:

- the OpenClaw skill definition
- the mode instructions
- the setup guide
- the deterministic support scripts
- the templates used for document and state handling
- example profile and data files
- the assets needed for polished PDF output

## Who this is for

This package is a good fit for:

- individual job seekers who want a disciplined system
- operators helping someone manage a high-touch search
- people targeting AI, solutions, automation, or forward-deployed roles
- anyone who wants one reusable workflow instead of dozens of scattered prompts

It is especially useful when the search is selective and high-value, not mass-market.
