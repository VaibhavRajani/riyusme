# RiyuSme

Tailor Riya’s Word resume to a job description with Claude — **format preserved**, **one page**, finance/ATS aware.

**Live:** [riyusme.vercel.app](https://riyusme.vercel.app) · **Repo:** [VaibhavRajani/riyusme](https://github.com/VaibhavRajani/riyusme)

## Features

- Default resume loads from `public/defaults/riya-resume.docx` (replace via upload anytime)
- Paste JD + optional notes → Claude rewrites experience/projects toward the role
- One-page lock: rewrites must be **same length or shorter** (no extra wrapped lines)
- Diff review before download; short **application blurb** (why company / how I’ll contribute)
- Does not change company names, titles, dates, or contact info; keeps scope realistic to the baseline

## Stack

Next.js (App Router) · TypeScript · Tailwind · Anthropic Claude Sonnet 5 · JSZip (in-place DOCX edits)

## Local setup

```bash
npm install
cp .env.example .env.local   # set ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Default resume path: `public/defaults/riya-resume.docx` (must be `.docx`, not `.doc`).

## Deploy (Vercel)

Repo is linked to Vercel. Set `ANTHROPIC_API_KEY` in project env (Production + Preview). Pushes to `master` deploy automatically.

## How it works

1. **Parse** — read paragraphs from `word/document.xml`
2. **Analyze** — JD keywords / must-haves
3. **Rewrite** — per-block edits + cover blurb; length lock + one retry
4. **Export** — patch approved text into the original DOCX runs

## Scripts

```bash
npm run dev          # local
npm run build        # production build
npm run smoke:docx   # DOCX parse/apply smoke test
npm run lint
```
