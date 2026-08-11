# RiyuSme

Tailor Riya’s Word resume to a job description with Claude — **format preserved**, **one page**, finance/ATS aware.

**Live:** [riyusme.vercel.app](https://riyusme.vercel.app) · **Repo:** [VaibhavRajani/riyusme](https://github.com/VaibhavRajani/riyusme)

## Features

- Default resume loads from `public/defaults/riya-resume.docx` (replace via upload anytime)
- Paste JD + optional notes → Claude rewrites experience/projects toward the role
- One-page lock: rewrites must be **same length or shorter** (no extra wrapped lines)
- Diff review before download; short **application blurb** (why company / how I’ll contribute)
- Download as **Word (.docx)** or **PDF** (format-preserving conversion)
- Does not change company names, titles, dates, or contact info; keeps scope realistic to the baseline

## Stack

Next.js (App Router) · TypeScript · Tailwind · Anthropic Claude Haiku 4.5 · JSZip (in-place DOCX edits)

## Local setup

```bash
npm install
cp .env.example .env.local   # set ANTHROPIC_API_KEY (+ CONVERTAPI_SECRET for PDF)
npm run dev                  # http://localhost:3000
```

Default resume path: `public/defaults/riya-resume.docx` (must be `.docx`, not `.doc`).

**PDF downloads** use [ConvertAPI](https://www.convertapi.com/) so Word layout (fonts, spacing, pagination) is preserved on Vercel. Add `CONVERTAPI_SECRET` to `.env.local` and Vercel env. Locally, LibreOffice can be used as a fallback if installed.

## Deploy (Vercel)

Repo is linked to Vercel. Set `ANTHROPIC_API_KEY` and `CONVERTAPI_SECRET` in project env (Production + Preview). Pushes to `master` deploy automatically.

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
