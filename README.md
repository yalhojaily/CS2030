# CS2030 — Software Engineering in the Age of Agents

A self-study curriculum website: 6 phases, 26 units, 134 lessons, 931 hours (about 65 weeks at 15 hours a week).

Live site: https://yalhojaily.github.io/CS2030/

## What each lesson has

- Summary and objectives
- A reading assignment: exact chapters or sections, time, and what to focus on (the site links to sources; it does not reproduce books)
- After-reading questions with a private notes box
- A practice task, or deliverables for unit projects
- The agent rule for its phase (from "tutor only" to "agent as partner")

Progress and notes are stored in the browser (localStorage), with JSON export and import on the Progress page.

## Editing the curriculum

All content is typed data in `src/data/`:

| File | Contents |
| --- | --- |
| `books.ts` | Every source: title, authors, link, free or paid |
| `phase1.ts` … `phase6.ts` | Phases, units and lessons |
| `curriculum.ts` | Totals, week ranges and helpers |

Each lesson is one `L(title, hours, summary, objectives, reading, questions, practice)` call. A title starting with `Project:` marks a unit project. Hours, weeks and totals on every page are computed from this data.

## Development

```bash
npm install
npm run dev      # http://localhost:4321/CS2030/
npm run build    # static site + Pagefind search index in dist/
```

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml` (Pages source: GitHub Actions).

## Stack

Astro + TypeScript, static output, Pagefind for search, no backend.
