# Career-Ops for OpenClaw

`career-ops` is an OpenClaw skill for managing the job search process end to end.

It helps you:

- review a job description
- judge fit before applying
- prepare application materials
- generate CV and supporting PDFs
- track opportunities and pipeline status
- scan and organize job sources
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

## What it actually does

This skill is built around a simple idea: every opportunity should go through the same disciplined workflow.

When you paste a job post or URL, it can:

- extract the job description
- score the role against your background
- create a report for that specific opportunity
- generate a tailored CV PDF
- prepare application answers when the fit is strong enough
- register the role in your tracker and pipeline

When you use it over time, it becomes a job-search operating system rather than a one-off assistant.

## What it searches automatically

The scanner is opinionated. It does not search the entire internet randomly.

Out of the box, it searches public job sources such as:

- Ashby
- Greenhouse
- Lever
- Wellfound
- Workable
- RemoteFront

It also ships with a preloaded company watchlist so it can check real career pages directly. The default list is focused on AI, agent, solutions, forward-deployed, automation, and AI-product roles.

That watchlist includes companies such as:

- OpenAI
- Anthropic
- PolyAI
- Parloa
- Intercom
- Hume AI
- ElevenLabs
- Deepgram
- Vapi
- Bland AI
- Retool
- Airtable
- Vercel
- Temporal
- Arize AI
- RunPod
- Glean
- Ada
- LivePerson
- Sierra
- Decagon
- Talkdesk
- Twilio
- Dialpad
- Gong
- Genesys
- Salesforce
- Langfuse
- Lindy
- Cognigy
- Speechmatics
- n8n
- Zapier
- Make.com
- Cohere
- LangChain
- Pinecone
- Mistral AI
- Weights & Biases
- Palantir
- Factorial
- Attio
- Tinybird
- Clarity AI
- TravelPerk

The default search patterns are aimed at roles like:

- AI Product Manager
- Solutions Architect
- Solutions Engineer
- Forward Deployed Engineer
- AI Engineer
- LLM Engineer
- Agentic / automation roles
- Voice AI and conversational AI roles
- GTM engineer and business-systems automation roles

It also filters out obvious noise, such as junior roles, internships, mobile roles, crypto/Web3, and unrelated tech stacks.

Users can customize this search behavior without changing the core skill.

The main knobs are in `portals.yml`:

- `search_queries` controls the broad discovery searches
- `tracked_companies` controls which specific company career pages are checked directly
- `title_filter` controls which job titles are considered relevant and which are ignored

That means if your search universe is different, you can:

- add new search queries for new boards or keywords
- remove default queries you do not care about
- disable specific default sources
- add your own company list
- tighten or loosen the title filter so the scanner reflects your real target roles

This is the main way to turn the skill from the shipped default into your own search system.

## How company-site scanning works

The skill does not rely on just one method.

It uses three layers:

1. Direct career-page scanning for specific companies.
2. Structured Greenhouse API access when a company exposes a public Greenhouse feed.
3. Broad search queries as a fallback for discovery.

In practice, that means:

- if a company has a clean public jobs page, the skill can read it directly
- if a company uses Greenhouse and exposes a public feed, the skill can read the structured listing faster
- if the site is harder to parse, the skill falls back to web search and public indexing

This is important because many modern job sites are dynamic, not simple text pages.

Out of the box, these sources are not scanned on a timer or in the background.

The search happens when you explicitly run the scan workflow, typically through `/career-ops scan`.

On each scan, the skill works through:

- all enabled default search queries in your `portals.yml`
- all enabled tracked companies in your `portals.yml`
- your own added companies and queries, if you have customized the file

So the frequency is user-controlled. If you want daily scans, you run it daily. If you want a focused weekly sweep, you run it weekly.

## What happens if you want a specific company

If you want the skill to focus on a company you care about, it can do that.

The intended product behavior is:

- add the company to your tracked company list
- point the skill at that company’s careers page
- let the scanner check that company directly on future runs

You can be quite specific here. A tracked company entry can include:

- the company name
- its public careers page
- an optional public Greenhouse API endpoint if it has one
- a search query for fallback discovery
- an `enabled` switch so you can keep companies in your list without actively scanning them

If the company uses a common recruiting platform such as Greenhouse, Ashby, or Lever, the skill is usually able to work with that pattern immediately.

If the company has its own custom careers page, the skill can still work, but the quality depends on how accessible the page is publicly.

If the job page is behind login, SSO, or an employee-only portal, the skill does not pretend it can see through that. In those cases it falls back to a manual flow:

- you paste the job description
- or you provide screenshots
- or you open the page in a logged-in browser session and use the live application flow

If a role is private but still worth keeping, the workflow preserves it instead of dropping it. The scan guidance stores inaccessible or private roles as a local JD file reference and keeps them in the pipeline for manual handling.

## How it handles your resume and profile

The skill treats your resume as a source of truth, not something to rewrite carelessly.

It expects three main inputs from you:

- `cv.md` for your actual resume content
- `config/profile.yml` for personal details, target roles, compensation range, and narrative
- `article-digest.md` if you want to include deeper proof points, case studies, or fresher metrics

These files are not decorative. The mode system is built to read them before evaluation work.

In practice:

- `cv.md` is the baseline factual record of your experience
- `config/profile.yml` is the baseline factual record of who you are targeting and how you present yourself
- `article-digest.md`, if present, is treated as the fresher source for detailed proof points and updated metrics

Its resume behavior is very specific:

- it reads your base resume before evaluating any role
- it matches job requirements against your real experience
- it uses your stored proof points and metrics
- it can tailor a CV for a specific role
- it generates a polished PDF version for applications

What it does not do:

- it does not invent experience
- it does not invent metrics
- it does not silently overwrite your base resume as the truth source

If both `cv.md` and `article-digest.md` mention the same project or metric, the workflow is designed to prefer the more detailed or newer proof point from `article-digest.md`.

For tailored CV output, it adjusts language and emphasis to the job description. It can:

- extract role keywords
- rewrite the summary for the role
- reorder bullets by relevance
- select the most relevant projects
- build a cleaner competency section

But it is meant to stay grounded in what is already true in your underlying material.

Users can customize how the skill reads and frames their profile by editing `config/profile.yml`.

That file controls product-level behavior such as:

- your name, email, phone, location, LinkedIn, portfolio, and public links
- your target roles and role archetypes
- your headline and transition narrative
- your proof points and hero metrics
- your target compensation range
- your location and work-authorization context

This matters because the skill uses that profile during evaluation, PDF generation, and application drafting. If you want it to frame you as an AI PM, Solutions Architect, or Forward Deployed candidate, this is where that direction is set.

## How application support works

This skill is not just for evaluating roles. It also helps when you are actually filling out an application.

In live apply mode, it can:

- read the current application page
- identify the company and role
- look up the matching report if one already exists
- generate answers for visible form questions
- adapt previous draft answers if you already evaluated the role earlier

This includes common application questions such as:

- why this role
- why this company
- relevant project or achievement
- work authorization
- salary expectations
- how did you hear about us

If the role on screen has changed from the one previously evaluated, the skill flags that and asks whether to adapt or re-evaluate.

This is also where your profile settings matter in a visible way. For example:

- compensation guidance comes from your profile settings
- work-authorization and location answers come from your profile settings
- portfolio or demo links come from your profile settings
- the underlying achievement examples come from your resume and proof-point files

## How the pipeline and tracker behave

The skill keeps a real operating history of your job search.

It maintains:

- a pipeline of roles to review
- an applications tracker
- scan history to avoid rediscovering the same jobs
- reports for evaluated roles
- generated PDFs and related output

It also enforces cleanup rules so the system does not drift over time:

- deduplicate repeated entries
- normalize statuses
- merge batch additions cleanly
- verify pipeline integrity
- prefer updating existing entries instead of creating duplicates

This is one of the main reasons the skill feels operational rather than conversational.

The scan workflow also gives explicit confirmation of what happened.

After a scan, the expected summary includes:

- how many queries were executed
- how many openings were found
- how many were filtered out by title rules
- how many were skipped as duplicates
- how many were added to the pipeline as new opportunities

So users get a concrete answer whether the run found something or found nothing.

The workflow also records scan history so repeated runs stay explainable over time. Entries are marked as:

- added
- skipped because the title did not match
- skipped because the role was already known

## What credentials or secrets are needed

For normal use, there are very few secrets.

Most users only need:

- their own profile information
- their resume content
- Playwright/browser support so the skill can read live job pages when needed

There is no required API key for basic scanning, evaluation, tracker management, or PDF generation inside this package.

Optional credentials may matter in a few cases:

- if you want the skill to read a page that only appears after login, you need an active logged-in browser session
- if you want to reference a private demo or dashboard in applications, you can store its URL and password in your profile
- if you want fully automated batch worker execution, you need to configure the batch worker command in your environment

The important product point is that secrets are not the main operating model here. This skill is designed to work primarily with public job pages, public company career pages, your own application materials, and your own browser session when needed.

What the skill does when credentials are missing:

- for public sites, it continues normally
- for login-gated pages, it marks the role for manual follow-up instead of faking a result
- for private or inaccessible job descriptions, it asks you to paste the JD or provide a screenshot

## What setup users actually need

From a product point of view, the setup is straightforward.

You need:

- your resume in `cv.md`
- your personal profile in `config/profile.yml`
- your portal and company watchlist in `portals.yml`
- the standard tracker and pipeline files used by the workflow

For most users, the two most important customization files are:

- `config/profile.yml` for who you are and what roles you want
- `portals.yml` for where the skill looks and what it treats as relevant

That split is intentional:

- profile customization changes how the skill presents and evaluates you
- portal customization changes where the skill searches and what it includes

Once that is in place, users can:

- start with `/career-ops`
- paste a job URL
- paste a raw job description
- run a scan over configured portals and tracked companies
- use apply mode while filling out an actual application

## How the skill decides what to do

The skill supports several named workflows, but the most important user-facing behavior is simple:

- `/career-ops` shows the menu
- `/career-ops` plus a job URL or pasted JD starts the automatic pipeline
- `/career-ops scan` checks configured portals and tracked companies
- `/career-ops apply` helps on a live application form
- `/career-ops pdf` creates a tailored application-ready PDF
- `/career-ops pipeline` works through queued opportunities

For users thinking operationally, `/career-ops scan` is the point where the out-of-the-box sources and your own custom sources get checked together. That is the moment when the scanner confirms whether there were new matches, only duplicates, only filtered roles, or nothing relevant at all.

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
