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

## Core capabilities

### 1. Job description review

The skill can take a job description, a job post URL, or raw role text and turn it into a structured evaluation.

Typical outcomes:

- summarize the role clearly
- identify fit and risk factors
- highlight missing requirements
- suggest whether it is worth pursuing
- prepare the next steps if the role looks good

### 2. Application preparation

The skill supports preparing the materials and context needed before applying.

This includes:

- tailoring the CV for a specific role
- preparing cover-letter or supporting materials
- capturing company and role details
- organizing the application into the tracker and pipeline

### 3. Tracking and pipeline management

The skill keeps job-search state organized across files so the process stays understandable and auditable.

It supports:

- pipeline review
- tracker updates
- status normalization
- duplicate cleanup
- merge handling
- verification of pipeline integrity

### 4. CV and PDF output

The skill can prepare polished output artifacts, including PDF generation for CV-based workflows.

This is useful when you need:

- a shareable document
- a clean application attachment
- a repeatable document generation workflow

### 5. Scanning and batch processing

The skill can scan sources and process multiple opportunities in a controlled batch flow.

This is useful when you want to:

- review many roles efficiently
- avoid manually handling each one from scratch
- keep status and tracking consistent across a queue

## How it behaves

The skill uses named modes rather than a single monolithic prompt.

Main modes:

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
- `auto-pipeline`

How routing works:

- If you call `/career-ops` with no extra input, it shows the command menu.
- If you call `/career-ops <mode>`, it goes directly to that workflow.
- If you paste a job description or a job URL, it automatically routes into `auto-pipeline`.

## What users need to set up

This skill expects a small set of working files so it can operate as a real job-search system.

Required source-of-truth files:

- `cv.md`
- `config/profile.yml`
- `portals.yml`

Required working files used by the workflow:

- `data/applications.md`
- `data/pipeline.md`
- `data/scan-history.tsv`

Helpful supporting files:

- `interview-prep/story-bank.md`
- `reports/`

If the required files are missing, the skill points users to the setup guidance in `references/setup.md`.

## What is included in this repository

This repository includes the full skill package needed to use and share the workflow:

- `SKILL.md` for skill routing and behavior
- mode-specific guidance in `references/modes/`
- setup guidance in `references/setup.md`
- deterministic scripts in `scripts/`
- batch workflow support in `scripts/batch/`
- templates for state and document generation
- example configuration and example content
- fonts and other assets needed for document output

## The user experience

The intended experience is simple:

1. Open the skill in OpenClaw.
2. Start with a job post, a URL, or a mode name.
3. Let the skill decide whether the role is worth pursuing.
4. Use the follow-up workflow to organize the application.
5. Keep the tracker, pipeline, and documents consistent as you move forward.

The emphasis is quality over quantity.

## Important behavior rules

The skill intentionally avoids weak or low-confidence behavior.

It follows these rules:

- no blind mass-apply behavior
- no auto-submit without human review
- discourage weak-fit applications
- prioritize fit and quality over volume
- verify live job state with browser-backed checks when needed

## Deterministic operations

Some actions are handled by scripts so the results are consistent.

These scripts cover:

- CV sync checking
- PDF generation
- tracker merging
- tracker deduplication
- pipeline verification
- status normalization

This matters because job-search state needs to stay clean and reliable over time.

## Dependencies

This skill expects:

- Node.js
- Playwright
- a browser runtime for browser-backed checks

Most users will only need to install the package dependencies and browser binaries once.

## Why this exists as a standalone package

This repository is designed to be posted and reused as a public skill package.

That means:

- the workflow is self-contained
- the behavior is documented in one place
- the scripts and templates travel with the skill
- the package can be shared without the original OpenClaw workspace

## If you are a user, start here

1. Read `SKILL.md` for the routing behavior.
2. Review `references/setup.md` if your files are not ready yet.
3. Start with `/career-ops` or paste a job description or URL.
4. Use the mode the skill routes you into.

## If you are publishing this skill

This repository is the publishable package.

It is meant to be cloned, installed, and used as:

- a GitHub-hosted skill repository
- a ClawHub.ai skill package
- a reusable OpenClaw workflow for job search operations

