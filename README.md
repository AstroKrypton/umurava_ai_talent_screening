<div align="center">

# Umurava AI Talent Screening Platform

Apple-inspired "Liquid Glass" experience for recruiters to create roles, ingest applicants, run Gemini-powered screenings, and review transparent shortlists.

</div>

## 1. Product Overview

- **Problem**: Recruiters spend too much time triaging high-volume, mixed-format applications with inconsistent evaluation criteria.
- **Solution**: Umurava AI orchestrates job creation, applicant ingestion, and Gemini-powered multi-candidate screening. Recruiters stay in control while AI provides ranked insights.
- **Target**: Hackathon-ready prototype aligned with Umurava's production roadmap.

## 2. Architecture Snapshot

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                  │
│  - App Router pages (Home, How it works, Recruiters, Jobs)  │
│  - Liquid Glass styling via Tailwind                        │
│  - JobsWorkspace client view for recruiter dashboard        │
└──────────────┬──────────────────────────────────────────────┘
               │API Routes (App Router handlers)
┌──────────────▼──────────────────────────────────────────────┐
│                     Backend (Node + MongoDB)                 │
│  - /api/jobs (create/list), /api/jobs/[id] (CRUD, applicants)│
│  - /api/jobs/[id]/applicants (ingestion, CSV/PDF imports)    │
│  - /api/screenings (trigger AI run)                          │
│  - Gemini orchestration via src/services/geminiScreening... │
└──────────────┬──────────────────────────────────────────────┘
               │Gemini API (Multi-model fallback)
┌──────────────▼──────────────────────────────────────────────┐
│                         AI Layer                            │
│  - Primary: gemini-3-flash-preview                          │
│  - Fallbacks: gemini-1.5-flash → gemini-1.5-pro             │
│  - Exponential backoff, Zod validation, heuristic fallback  │
└─────────────────────────────────────────────────────────────┘
```

### Key Directories

- `app/` – App Router pages plus serverless API routes
- `components/` – shared layout + recruiter workspace UI (Liquid Glass)
- `src/services/` – Gemini screening orchestration, fallback heuristics
- `models/` – Mongoose models (Job, Applicant, Screening)
- `store/` – Redux slices (if enabling stateful features)
- `tests/` – Vitest suites for services and React components

## 3. Environment Variables

Create `.env.local` (never commit secrets):

```bash
MONGODB_URI="mongodb+srv://..."
GEMINI_AI_API_KEY="<google ai studio key>"
JWT_SECRET="<session signing secret>"
```

- `GEMINI_AI_API_KEY` is mandatory for all screening runs.
- Ensure identical values are configured in Vercel/Railway dashboards.

## 4. Local Development

```bash
npm install

# optional: seed MongoDB with mock roles/applicants
# node scripts/seed.js

npm run dev
```

Navigate to `http://localhost:3000`. The recruiter workspace lives at `/workspace` once authenticated.

### Testing

```bash
npm test          # Vitest suites (services + React components)
npm run lint      # ESLint (Next configuration)
```

## 5. Deployment Strategy

### Single Deployment (Recommended for Hackathon)
- Deploy the Next.js app to **Vercel**. App Router API routes serve as the backend.
- Configure `GEMINI_AI_API_KEY`, `MONGODB_URI`, and `JWT_SECRET` in Vercel → Project → Settings → Environment Variables.

### Split Stack (Optional)
- **Frontend** → Vercel or Netlify (static + serverless rendering)
- **Backend** → Railway/Render (Express/Fastify). Move `/api/**` handlers into a dedicated Node service and update frontend fetches to use REST endpoints.

## 6. AI Screening Flow

1. Recruiter triggers `/api/screenings` with `jobId`.
2. Service fetches job schema + applicant batch, builds prompt, and calls Gemini via `geminiScreeningService.ts`.
3. Automatic retry on HTTP 429/503 with exponential backoff.
4. Model fallback chain: `gemini-3-flash-preview` → `gemini-1.5-flash` → `gemini-1.5-pro`.
5. If all models fail or produce short reasoning, `screeningService.ts` derives a heuristic shortlist.
6. Zod schemas validate output; errors surface as recruiter-facing toasts.

## 7. Core Features

- Liquid Glass UI across landing, how-it-works, and recruiters pages.
- Recruiter Workspace:
  - Create, edit, and archive roles in glass-panel dialogs.
  - Applicant ingestion via CSV/PDF (Apple-style upload flows).
  - Escalade Loader animation while Gemini processes.
  - Screening history with load-more pagination + detail view.
  - Count-up metrics on landing page with viewport-triggered animation.
- Toast feedback for success/error states.
- Robust Gemini integration with structured result mapping.

## 8. Workflows

1. **Job lifecycle**: Create → Edit → Archive (liquid glass dialogs with Apple-like micro-interactions).
2. **Applicant ingestion**: CSV or PDF import surfaces summary + warnings.
3. **AI screening review**: Timeline of runs, detail view per candidate (strengths, gaps, recommendation).
4. **Navigator**: `/how-it-works` and `/recruiters` informational routes for marketing.

## 9. Roadmap / Outstanding Enhancements

- Authentication polish (currently mocked session helpers).
- Live deployment & CI pipeline documentation.
- Dedicated analytics dashboard for screening metrics.
- Role cloning and applicant bulk actions.
- Offline-friendly CSV parsing worker.

## 10. Maintainers

- **Team Umurava Hackathon** – contact: competence@umurava.africa
- Questions? Join the hackathon WhatsApp group or reach out to mentors.
