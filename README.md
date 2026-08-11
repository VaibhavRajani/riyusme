# RiyuSme — ATS Resume Tailor

Tailor a Word (`.docx`) resume to a pasted job description using Claude — preserving fonts, spacing, colors, and one-page layout.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Anthropic Claude (Sonnet) for finance-aware, ATS-oriented rewrites
- JSZip for surgical DOCX text edits (no format rebuild)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env and add your [Anthropic API key](https://console.anthropic.com/):

```bash
cp .env.example .env.local
```

3. Run locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Add environment variable `ANTHROPIC_API_KEY`.
4. Deploy.

Hobby plan: rewrite routes may take 30–60s; `maxDuration` is set on API routes.

## How it works

1. **Parse** — extracts resume paragraphs/bullets from `word/document.xml`.
2. **Analyze** — pulls ATS keywords / must-haves from the JD (finance-aware).
3. **Rewrite** — Claude returns per-line edits. Experience and project bullets may be reshaped as wholes toward the JD. Rules enforce:
   - no company / title / date / contact changes
   - resume is the seniority/impact baseline (no fresher → “led 100 people / +$10M ARR” leaps)
   - ±20% word-count lock (retries once on violations)
   - skill reframes when supported by resume or **Additional notes**
4. **Export** — applies approved text into the original DOCX runs so formatting stays intact.

## Scripts

| Command       | Description        |
|---------------|--------------------|
| `npm run dev` | Local development  |
| `npm run build` | Production build |
| `npm run start` | Serve build      |
| `npm run lint`  | ESLint           |
