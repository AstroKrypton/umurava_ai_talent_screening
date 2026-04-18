# Umurava AI Talent Screening Platform — System Documentation

> Version: 2026-04-18 · Audience: Product, Engineering, Design, and Ops teams

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Personas & User Goals](#2-personas--user-goals)
3. [Solution Overview](#3-solution-overview)
4. [Architecture](#4-architecture)
5. [Core Application Domains](#5-core-application-domains)
6. [Frontend Application](#6-frontend-application)
7. [Backend & API Surface](#7-backend--api-surface)
8. [AI & Automation Layer](#8-ai--automation-layer)
9. [Data Models & Persistence](#9-data-models--persistence)
10. [UX & Visual Language](#10-ux--visual-language)
11. [Operational Workflows](#11-operational-workflows)
12. [Security, Compliance & Fairness](#12-security-compliance--fairness)
13. [Environment Configuration](#13-environment-configuration)
14. [Local Development](#14-local-development)
15. [Testing & Quality](#15-testing--quality)
16. [Deployment & DevOps](#16-deployment--devops)
17. [Observability & Support](#17-observability--support)
18. [Future Enhancements](#18-future-enhancements)
19. [Appendix A – Key Files & Directories](#19-appendix-a--key-files--directories)
20. [Appendix B – API Endpoint Reference](#20-appendix-b--api-endpoint-reference)
21. [Appendix C – Glossary](#21-appendix-c--glossary)

---

## 1. Executive Summary
Umurava AI Talent Screening is a recruiter-facing platform that blends Apple-inspired Liquid Glass aesthetics with AI-assisted hiring workflows. Recruiters compose and manage job profiles, ingest applicant data, trigger Gemini-powered screenings, and interpret transparent shortlists — all while staying compliant with fairness best practices.

Key differentiators:
- **Speed:** AI-assisted draft publishing, applicant imports, and shortlist generation reduce recruiter toil.
- **Transparency:** Rich candidate insights (strengths, gaps, recommendations) with visual scoring components.
- **Fairness:** Real-time AI Fairness Guard and Profile Strength checklist encourage inclusive, complete job postings.
- **Polish:** Consistent Liquid Glass design language across marketing and workspace surfaces.

## 2. Personas & User Goals
| Persona | Goals | Pain Relieved |
| --- | --- | --- |
| Recruiter / Hiring Manager | Publish roles quickly, assess applicants objectively, maintain brand aesthetics | Manual triage, inconsistent evaluations |
| Talent Operations | Ensure fairness, compliance, auditability | Risk of biased language, opaque AI decisions |
| Product & AI Team | Ship reliable AI experiences, monitor performance | Integration drift, model fallback complexity |

## 3. Solution Overview
The system is composed of three primary layers:
1. **Frontend (Next.js App Router)**: Public marketing pages and an authenticated recruiter workspace.
2. **Backend API Routes**: Serverless handlers for jobs, applicants, screenings, and supporting libraries.
3. **AI & Services**: Gemini screening orchestration with resilience (fallbacks, retries, validation).

Complementary services provide CSV/PDF parsing, caching, and client-side state management via lightweight React state (no global Redux in current build).

## 4. Architecture
```
┌───────────────────────────────────────────────────────────────┐
│ Frontend (Next.js 14+, App Router)                            │
│  • Landing, how-it-works, jobs marketing pages                │
│  • Recruiter workspace (JobsWorkspace.tsx)                    │
│  • Liquid Glass component library (components/ui, workspace)  │
└──────────────┬────────────────────────────────────────────────┘
               │ fetch / mutate via fetch()                      
┌──────────────▼────────────────────────────────────────────────┐
│ Backend (App Router API Routes)                               │
│  • app/api/jobs (CRUD + listing)                              │
│  • app/api/jobs/[id]/screenings (history)                     │
│  • app/api/screenings (trigger AI)                            │
│  • Validation (lib/jobs-validation.ts)                        │
└──────────────┬────────────────────────────────────────────────┘
               │ Gemini & services                               
┌──────────────▼────────────────────────────────────────────────┐
│ AI & Services                                                  │
│  • src/services/geminiScreeningService.ts                      │
│  • src/services/applicantImportService.ts                      │
│  • src/services/pdfResumeParser.ts                             │
│  • Fallback orchestration, Zod validation, heuristics          │
└───────────────────────────────────────────────────────────────┘
```
Supporting infrastructure includes MongoDB (via Mongoose models in `models/`), utility libraries under `lib/`, and Vitest test suites in `tests/`.

## 5. Core Application Domains
1. **Job Management** – Create, edit, draft, publish, and archive roles with AI-guided controls (Profile Strength, Fairness Guard, dual-intent submission).
2. **Applicant Intake** – Upload CSV/PDF resumes, map candidate data, review warnings, and maintain import summaries.
3. **AI Screening** – Trigger Gemini runs, monitor status with Escalade Loader, explore shortlist details, and export CSV insights.
4. **Marketing & Onboarding** – Informational pages guiding recruiters through the platform value proposition.

## 6. Frontend Application
- **Framework:** Next.js (App Router, React Server/Client components). Jobs workspace is a Client Component (`components/workspace/JobsWorkspace.tsx`).
- **Styling:** Tailwind CSS with custom Liquid Glass tokens (translucent panels, soft gradients, rounded geometry).
- **Component Highlights:**
  - `JobsWorkspace.tsx` – central recruiter dashboard (job list, spotlight modal, screenings).
  - `components/ui/OverallScoreGauge.tsx` & `DetailedProgressBar.tsx` – Apple-inspired data viz.
  - `AIFairnessGuard` and `Profile Strength` modules integrated into job dialog for compliance nudges.
  - `EscaladeLoader` – signature animated loader used during AI operations.
- **State Management:** Local `useState` / `useMemo` inside workspace; `store/` directory holds Redux slices for future cross-component sharing (currently optional).
- **Routing:** Public pages under `app/`; workspace entry is mounted via authenticated routes (placeholder auth currently).
- **Accessibility:** Buttons with keyboard handlers, `aria-live` regions for fairness feedback, focus states on interactive cards.

## 7. Backend & API Surface
- **API Routes (App Router):**
  - `app/api/jobs/route.ts` – GET job listings, POST new job (draft/publish handling).
  - `app/api/jobs/[id]/route.ts` – GET/PUT/PATCH/DELETE individual jobs.
  - `app/api/jobs/[id]/screenings/route.ts` – historical screening data retrieval.
  - `app/api/screenings/route.ts` – initiates screening runs.
- **Validation:** `lib/jobs-validation.ts` defines Zod schemas for job creation/update; relaxed rules for drafts.
- **Caching/Query Helpers:** `lib/jobs-query.ts`, `lib/jobs-cache.ts` orchestrate fetch & invalidation patterns.
- **Authentication:** Placeholder helpers (`hooks/useAuth.ts`, `lib/auth.ts`) – integrate with real IdP in production.

## 8. AI & Automation Layer
- **Primary Service:** `src/services/geminiScreeningService.ts`
  - Builds structured prompts using job + applicant context.
  - Calls Gemini (`gemini-3-flash-preview` primary, fallbacks to `gemini-1.5-flash`, `gemini-1.5-pro`).
  - Exponential backoff on 429/503, with fallback to heuristic shortlist if LLM fails.
  - Normalizes responses into consistent schema consumed by UI.
- **Applicant Import Services:**
  - `src/services/applicantImportService.ts` handles CSV parsing, mapping, and deduplication.
  - `src/services/pdfResumeParser.ts` extracts structured info from PDF uploads.
- **AI Fairness Guard:** Client-side scanner cross-checks job description against curated bias dictionary with debounce; surfaces guidance states (idle, scanning, biased, inclusive).
- **Profile Strength Checklist:**
  - Evaluates core fields (title, location, skills, description).
  - Displays progress bar (Umurava green gradient) and actionable nudges.

## 9. Data Models & Persistence
- **Mongoose Models (`models/`):**
  - `Job.ts` – status enum (`draft`, `open`, `screening`, `closed`), experience, skills, metadata.
  - `Applicant.ts` – demographic-neutral candidate schema with nested experience, education, skills.
  - `Screening.ts` – run metadata, results array, processing timestamps.
  - `User.ts` – recruiter account details (currently minimal for mock auth).
- **Data Flow:**
  1. Frontend form → API route (POST/PATCH) → Zod validation.
  2. API route → Mongoose model → MongoDB persistance.
  3. Screening run → service orchestrates Gemini → stores results → UI fetches via API.
- **Caching:** In-memory caches (where applicable) via helper libs; consider Redis layer for production scale.

## 10. UX & Visual Language
- **Liquid Glass Principles:**
  - Translucent panels (`bg-white/60`, `backdrop-blur-2xl`) with subtle borders.
  - Rounded geometry (rounded-3xl) and soft drop shadows for depth.
  - Gradient accents (brand greens/blues) on CTAs and metrics.
- **Motion:**
  - Animated loaders (`EscaladeLoader`).
  - Button hover transitions, focus rings, and card elevation.
  - Count-up metrics (landing page) and progress animations (Profile Strength).
- **Consistency:** UI components reuse shared classes and tokens defined in `globals.css` and local constants (`glassPanelClass`, color variables).

## 11. Operational Workflows
1. **Job Draft → Publish**
   - Recruiter opens modal, completes fields.
   - Fairness Guard scans for bias; Profile Strength encourages completion.
   - “Save Draft” or “Publish Role” buttons send intent-specific payloads.
2. **Applicant Import**
   - CSV/PDF upload triggers parsing service, surfaces summary + warnings.
   - Data saved to `Applicant` collection, associated with job.
3. **AI Screening**
   - Recruiter presses “Run Screening”.
   - UI validates status (draft jobs blocked) and invokes `/api/screenings`.
   - Gemini generates shortlist; result stored and displayed with gauges & progress bars.
4. **Review & Export**
   - Screening history available with load-more pagination.
   - CSV export of shortlist for external review.

## 12. Security, Compliance & Fairness
- **Fairness Guard** ensures job descriptions avoid flagged terminology.
- **AI Usage:** Prompts avoid sensitive attributes; fallback heuristics maintain deterministic behaviour when AI fails.
- **Data Protection:**
  - `.env.local` houses secrets; environment variables required for production.
  - Future work: integrate auth + RBAC, audit logs, encryption at rest for MongoDB.
- **Compliance:** Provide future hooks for SOC2/GDPR readiness (data deletion endpoints, consent records).

## 13. Environment Configuration
Create `.env.local` with:
```
MONGODB_URI=
GEMINI_AI_API_KEY=
JWT_SECRET=
```
Optional additions: logging levels, feature flags for AI fairness and profile strength modules.

## 14. Local Development
```bash
npm install
npm run dev
```
Access `http://localhost:3000`. Recruiter workspace is gated behind auth placeholder (simulate session via mocked hook or extend `useAuth.ts`).

Seed scripts (optional) can populate jobs/applicants for demos (`scripts/seed.js`, to be authored if required).

## 15. Testing & Quality
- **Unit / Service Tests:** Vitest suites under `tests/` (e.g., `applicantImportService.test.ts`, `pdfResumeParser.test.ts`).
- **Component Tests:** React Testing Library for key UI like `JobDetail.test.tsx`.
- **API Tests:** `/tests/api/jobs-route.test.ts` covers job lifecycle scenarios.
- **Linting:** `npm run lint` (ESLint with Next.js config).
- **Future:** Add integration tests for draft → publish flow and AI fairness guard logic (mock bias dictionary).

## 16. Deployment & DevOps
- **Recommended:** Deploy entire Next.js repo to Vercel (handles static + serverless API).
- **Environment Variables:** Configure via Vercel dashboard.
- **CI/CD:** (To implement) – GitHub Actions workflow for lint, test, build.
- **Scaling Considerations:** For sustained traffic, consider extracting screening service to background workers (queue + worker process) to avoid blocking serverless functions.

## 17. Observability & Support
- **Current:** Console logging and toast notifications.
- **Planned:**
  - Structured logging with Pino/Winston.
  - Monitoring hooks (Datadog/New Relic) for API latency and Gemini failure rates.
  - Centralized error boundary with user-friendly fallback UI.

## 18. Future Enhancements
- Full authentication & role-based access control.
- Analytics dashboard (conversion from draft → publish, screening success rates).
- Collaborative features (comments, approval workflow, notifications).
- Deeper fairness analytics (bias scanner across applicants & AI outputs).
- Resume parsing workers with offline/queue resilience.

## 19. Appendix A – Key Files & Directories
| Path | Description |
| --- | --- |
| `app/` | App Router routes (pages + API). |
| `components/workspace/JobsWorkspace.tsx` | Recruiter HQ component (jobs, applicants, screenings). |
| `components/ui/` | Shared visual components (gauges, progress bars). |
| `src/services/` | Server-side business logic (Gemini, import, parsing). |
| `lib/` | Helpers for auth, validation, caching. |
| `models/` | Mongoose schemas for persistence. |
| `store/` | Redux slices (available for future global state). |
| `tests/` | Vitest suite for services and components. |
| `public/` | Static assets (SVGs, icons). |

## 20. Appendix B – API Endpoint Reference
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/jobs` | List jobs (filterable by status client-side). |
| POST | `/api/jobs` | Create job (draft or open based on intent). |
| GET | `/api/jobs/:id` | Retrieve job details. |
| PATCH | `/api/jobs/:id` | Update job fields, handle draft → publish transitions. |
| DELETE | `/api/jobs/:id` | Archive job. |
| GET | `/api/jobs/:id/screenings` | Fetch screening history for job. |
| POST | `/api/screenings` | Trigger AI screening run (requires `jobId`). |
| POST | `/api/jobs/:id/applicants` *(future)* | Upload applicants (CSV/PDF). |

## 21. Appendix C – Glossary
- **Liquid Glass** – Apple-inspired UI aesthetic: translucent panels, soft gradients, rounded edges.
- **Gemini** – Google’s multimodal LLM powering AI screening.
- **Fairness Guard** – Real-time bias scanner for job descriptions.
- **Profile Strength** – Progress indicator guiding recruiters to complete essential job fields.
- **Escalade Loader** – Custom animated loader used during long-running operations.
- **Shortlist** – AI-curated subset of applicants ranked by relevance to the job.

---

For questions or contributions, contact the Umurava hackathon team at `competence@umurava.africa`.
