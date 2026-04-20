Umurava AI Hackathon - Technical Documentation v2.0
AI-Powered Talent Profile Screening Tool

# UMURAVA AI HACKATHON

## Full Technical Documentation

### AI-Powered Talent Profile Screening Tool — v2.0

_Updated to reflect official Umurava Talent Profile Schema_

| **Document Version** | 2.0.0 — Schema-aligned                                              |
| -------------------- | ------------------------------------------------------------------- |
| **Project Name**     | Umurava AI Talent Screening                                         |
| **Hackathon Theme**  | AI Products for Human Resources Industry                            |
| **Tech Stack**       | Next.js · Node.js · TypeScript · MongoDB · Gemini API               |
| **Colour Palette**   | Rwanda-inspired (Sky Blue, Forest Green, Basket Gold, Imigongo Red) |
| **Contact**          | competence@umurava.africa                                           |

> **⚠️ v2.0 Update Notice**
>
> This v2.0 update replaces all previous database schemas, Mongoose models, TypeScript interfaces, dummy data structure, and AI prompt field references to match the **official Umurava Talent Profile Schema Specification exactly**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Official Umurava Talent Profile Schema](#3-official-umurava-talent-profile-schema)
4. [MongoDB Collections & Mongoose Models](#4-mongodb-collections--mongoose-models)
5. [TypeScript Type Definitions](#5-typescript-type-definitions)
6. [Core Logic](#6-core-logic)
7. [Inclusion Insights](#7-inclusion-insights)
8. [API Design](#8-api-design)
9. [Development Tasks & Sub-Tasks](#9-development-tasks--sub-tasks)
10. [Environment Variables Reference](#10-environment-variables-reference)
11. [Assumptions & Limitations](#11-assumptions--limitations)

---

## 1. Project Overview

Umurava is building an AI-powered talent profile screening tool that augments recruiters' decision-making while keeping humans in control of final hiring decisions. The system addresses two critical pain points in modern recruiting: high application volumes and difficulty objectively comparing candidates across diverse profiles and formats.

### 1.1 Problem Statement

| **Challenge**               | **Description**                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **High Application Volume** | Recruiters receive hundreds of applications per role, making manual review unsustainable and increasing time-to-hire. |
| **Inconsistent Evaluation** | Comparing candidates across unstructured resumes and structured profiles is subjective and error-prone.               |
| **Explainability Gap**      | Most ATS tools rank candidates without explaining why, making it hard for recruiters to defend decisions.             |

### 1.2 Core Value Proposition

- Screens applicants from the Umurava platform (structured talent profiles using the official schema) and external job boards
- Produces a ranked shortlist of Top 10 or Top 20 candidates per job
- Generates natural-language reasoning per candidate covering strengths, gaps, and role relevance
- All dummy data and real profiles strictly follow the official Umurava Talent Profile Schema Specification

### 1.3 System Scenarios

#### Scenario 1 — Umurava Platform Profiles

- **Input:** Job details + structured talent profiles following the official Umurava schema
- **Process:** AI analyses all applicants against criteria, scores and ranks, returns a shortlist
- **Requirement:** All dummy data must use exact field names from the official schema (`firstName`, `lastName`, `skills[].level`, `experience[].role`, etc.)

#### Scenario 2 — External Job Board Applicants

- **Input:** Manually entered job details + uploaded CSV/Excel or PDF resume links
- **Process:** Parsed external applicants are normalised into the Umurava schema format before screening
- **Design Freedom:** Teams have full design freedom for parsing and matching methodology

---

## 2. System Architecture

### 2.1 High-Level Architecture

```ascii
┌─────────────────────────────────────────────────────────────────┐
│                          Three-Tier Architecture                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │   Frontend   │───▶ │  Backend   │───▶│   AI Layer  │            │
│ │  (Next.js)  │    │ (Node.js)  │    │(Gemini API) │            │
│ └──────────────┘    └──────────────┘    └──────────────┘        │
│                      │        │                  │              │
│                      ▼        │                  │              │
│                ┌──────────────┐                  │              │
│                │  MongoDB     │◀─────────────────┘              │
│                │   Atlas      │                                   │
│                └──────────────┘                                   │
│                                                                 │
│  User Interface    Business Logic     AI Orchestration           │
│  State Management  REST Endpoints     Prompt Engineering         │
│  File Uploads      Data Persistence    Response Parsing          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Responsibilities

| **Layer**   | **Technology**             | **Responsibility**                               | **Key Outputs**                                  |
| ----------- | -------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| Frontend    | Next.js + Tailwind + Redux | Recruiter UI, forms, upload, shortlist display   | User interactions, job forms, file uploads       |
| Backend API | Node.js + TypeScript       | REST endpoints, business logic, AI orchestration | Processed jobs, applicants, screening triggers   |
| AI Layer    | Gemini API (mandatory)     | Candidate scoring, ranking, reasoning            | Ranked shortlist JSON with explanations          |
| Database    | MongoDB Atlas              | Persistent storage for all entities              | Collections: jobs, applicants, screenings, users |

### 2.3 Data Flow

#### Screening Request Flow

Recruiter creates job & uploads applicants
│
▼
Frontend dispatches Redux action
│
▼
POST /api/screenings/trigger
│
▼
Backend validates & fetches applicants from MongoDB
│
▼
Builds AI prompt using official schema field names
│
▼
Gemini returns structured JSON (ranked candidates + scores + reasoning)
│
▼
Backend persists result
│
▼
Frontend polls and renders shortlist

````
### 2.4 Deployment Architecture

| **Component** | **Recommended Host** |
| --- | --- |
| Frontend (Next.js) | Vercel — automatic CI/CD from main branch |
| Backend API (Node.js) | Railway, Render, or Fly.io |
| Database | MongoDB Atlas — free M0 cluster |
| File Storage (resumes) | Cloudinary or AWS S3 presigned URLs |
| Environment Variables | Stored in platform dashboard — never committed to git |

---

## 3. Official Umurava Talent Profile Schema

> **⚠️ IMPORTANT — v2.0 Update**
>
> This section now reflects the official Umurava Talent Profile Schema Specification exactly.
>
> All field names, types, and required flags below are **authoritative**.
>
> Core fields must NOT be modified or removed. The schema may be extended with AI scores and ratings.

### 3.1 Basic Information

Top-level fields on every talent profile.

| **Field Name** | Type · Required · Description |
| --- | --- |
| **firstName** | string · Required · Talent's first name |
| **lastName** | string · Required · Talent's last name |
| **email** | string · Required · Unique email address |
| **headline** | string · Required · Short professional summary (e.g. "Backend Engineer — Node.js & AI Systems") |
| **bio** | string · Optional · Detailed professional biography |
| **location** | string · Required · Current location (City, Country) |

### 3.2 Skills & Languages

#### skills — object[] · Required

List of skills, each with a proficiency level and years of experience.

| **Sub-field** | Type · Description |
| --- | --- |
| **name** | string · Skill name (e.g. "Node.js", "Figma") |
| **level** | string · Enum: `Beginner` \| `Intermediate` \| `Advanced` \| `Expert` |
| **yearsOfExperience** | number · Years actively using this skill |

```json
{
  "name": "Node.js",
  "level": "Advanced",
  "yearsOfExperience": 3
}
```

#### languages — object[] · Optional

Spoken languages with proficiency level.

| Sub-field | Type · Description |
| --- | --- |
| name | string · Language name (e.g. "English", "Kinyarwanda") |
| proficiency | string · Enum: `Basic` \| `Conversational` \| `Fluent` \| `Native` |

**Example:**
```json
{
  "name": "English",
  "proficiency": "Fluent"
}
```

#### 3.3 Work Experience
experience — object[] · Required
Professional experience history. Each entry represents one role.

| Sub-field | Type · Description |
| --- | --- |
| company | string · Company or organisation name |
| role | string · Job title held (e.g. "Backend Engineer") |
| startDate | string · Format: `YYYY-MM` |
| endDate | string · Format: `YYYY-MM` or `"Present"` if current |
| description | string · Key responsibilities and achievements |
| technologies | string[] · List of tools/technologies used in this role |
| isCurrent | boolean · true if this is the active role |

**Example:**
```json
{
  "company": "Company Name",
  "role": "Backend Engineer",
  "startDate": "2022-03",
  "endDate": "Present",
  "description": "Key responsibilities and achievements",
  "technologies": ["Node.js", "PostgreSQL"],
  "isCurrent": true
}
```

#### 3.4 Education
education — object[] · Required
Academic background. Each entry represents one qualification.

| Sub-field   | Type · Description |
| ----------- | ------------------ |
| institution | string · University or institution name |
| degree      | string · Degree title (e.g. "Bachelor's", "Master's", "PhD") |
| fieldOfStudy| string · Field or major (e.g. "Computer Science") |
| startYear   | number · Year studies commenced |
| endYear     | number · Year completed (omit if ongoing) |

**Example:**
```json
{
  "institution": "University of Rwanda",
  "degree": "Bachelor's",
  "fieldOfStudy": "Computer Science",
  "startYear": 2020,
  "endYear": 2024
}
```
3.5 Certifications
certifications — object[] · Optional
Professional certifications and credentials.

Sub-field	Type · Description
name	string · Certification title (e.g. "AWS Certified Developer")
issuer	string · Issuing body (e.g. "Amazon")
issueDate	string · Format: YYYY-MM
json
{
  "name": "AWS Certified Developer",
  "issuer": "Amazon",
  "issueDate": "2023-06"
}
3.6 Projects
projects — object[] · Required
Portfolio projects demonstrating practical skills.

Sub-field	Type · Description
name	string · Project name
description	string · What the project does and the candidate's contribution
technologies	string[] · Technologies and tools used
role	string · Candidate's role on the project (e.g. "Backend Engineer")
link	string · Live URL or repository link (optional)
startDate	string · Format: YYYY-MM
endDate	string · Format: YYYY-MM (omit if ongoing)
json
{
  "name": "AI Recruitment System",
  "description": "AI-powered candidate screening platform",
  "technologies": ["Next.js", "Node.js", "Gemini API"],
  "role": "Backend Engineer",
  "link": "https://github.com/...",
  "startDate": "2024-01",
  "endDate": "2024-06"
}
3.7 Availability
availability — object · Required
Talent's current work availability.

Sub-field	Type · Description
status	string · Enum: Available | Open to Opportunities | Not Available
type	string · Enum: Full-time | Part-time | Contract
startDate	string · Format: YYYY-MM-DD · Optional — earliest available date
json
{
  "status": "Available",
  "type": "Full-time",
  "startDate": "2025-05-01"
}
3.8 Social Links
socialLinks — object · Optional
External profile links.

Sub-field	Type · Description
linkedin	string · LinkedIn profile URL
github	string · GitHub profile URL
portfolio	string · Personal website or portfolio URL
json
{
  "linkedin": "https://linkedin.com/in/...",
  "github": "https://github.com/...",
  "portfolio": "https://..."
}
3.9 Complete Profile Example (Umurava Schema)
A fully valid talent profile following the official Umurava schema:

```json
{
  "firstName": "Amina",
  "lastName": "Uwase",
  "email": "amina.uwase@email.com",
  "headline": "Senior Backend Engineer — Node.js & AI Systems",
  "bio": "6 years building scalable APIs and AI-integrated platforms.",
  "location": "Kigali, Rwanda",
  "skills": [
    { "name": "Node.js", "level": "Expert", "yearsOfExperience": 6 },
    { "name": "TypeScript", "level": "Advanced", "yearsOfExperience": 4 },
    { "name": "MongoDB", "level": "Intermediate", "yearsOfExperience": 3 }
  ],
  "languages": [
    { "name": "Kinyarwanda", "proficiency": "Native" },
    { "name": "English", "proficiency": "Fluent" }
  ],
  "experience": [
    {
      "company": "Kigali Tech Ltd",
      "role": "Senior Backend Engineer",
      "startDate": "2021-03",
      "endDate": "Present",
      "description": "Led API architecture for fintech platform serving 200k users.",
      "technologies": ["Node.js", "TypeScript", "MongoDB", "Redis"],
      "isCurrent": true
    }
  ],
  "education": [
    {
      "institution": "University of Rwanda",
      "degree": "Bachelor's",
      "fieldOfStudy": "Computer Science",
      "startYear": 2015,
      "endYear": 2019
    }
  ],
  "certifications": [
    { "name": "AWS Certified Developer", "issuer": "Amazon", "issueDate": "2023-06" }
  ],
  "projects": [
    {
      "name": "AI Recruitment Platform",
      "description": "End-to-end AI screening tool using Gemini API",
      "technologies": ["Next.js", "Node.js", "Gemini API", "MongoDB"],
      "role": "Backend Engineer",
      "link": "https://github.com/amina/ai-recruit",
      "startDate": "2024-01",
      "endDate": "2024-06"
    }
  ],
  "availability": {
    "status": "Available",
    "type": "Full-time",
    "startDate": "2025-05-01"
  },
  "socialLinks": {
    "linkedin": "https://linkedin.com/in/amina-uwase",
    "github": "https://github.com/aminauwase",
    "portfolio": "https://aminauwase.dev"
  }
}
3.10 Schema Extensibility
Teams may extend the schema with additional fields such as:

AI-generated scores (overallScore, skillsScore, experienceScore)

Portfolio ratings

Personality insights

Core fields (sections 3.1–3.8) must NOT be modified or removed.

4. MongoDB Collections & Mongoose Models
All models are written in TypeScript with Mongoose. Field names match the official Umurava schema exactly.

4.1 Users Collection
Field	Type & Description
_id	ObjectId — auto-generated primary key
email	String, unique, required
passwordHash	String, required — bcrypt hash (rounds: 12)
name	String, required — display name
role	Enum: 'recruiter' | 'admin'
organisation	String — company or team name
createdAt / updatedAt	Date — timestamps
4.2 Jobs Collection
Field	Type & Description
_id	ObjectId — primary key
createdBy	ObjectId → users
title	String, required — e.g. 'Senior Backend Engineer'
description	String, required — full job description
requiredSkills	String[] — skill names that match skills[].name in talent profiles
niceToHaveSkills	String[] — bonus skills
minExperienceYears	Number — minimum years of total experience
educationLevel	Enum: 'any' | 'bachelor' | 'master' | 'phd'
location	String — city/country or 'Remote'
employmentType	Enum: 'full-time' | 'part-time' | 'contract'
shortlistSize	Number — 10 or 20
status	Enum: 'draft' | 'open' | 'screening' | 'closed'
source	Enum: 'umurava' | 'external'
createdAt / updatedAt	Date — timestamps
4.3 Applicants Collection (Umurava Schema aligned)
All field names in this collection now match the official Umurava Talent Profile Schema exactly.

Do not rename fields. The AI prompt and scoring logic reference these names directly.

Top-level fields
Field	Type & Description
_id	ObjectId — primary key
jobId	ObjectId → jobs — which job this applicant applied for
source	Enum: 'umurava' | 'external'
umuravaProfileId	String — original Umurava platform ID (Umurava profiles only)
firstName	String, required
lastName	String, required
email	String, required
headline	String, required — short professional summary
bio	String — detailed biography
location	String, required — City, Country
skills	SkillObject[] — see sub-schema below
languages	LanguageObject[] — see sub-schema below
experience	ExperienceObject[] — see sub-schema below
education	EducationObject[] — see sub-schema below
certifications	CertificationObject[] — see sub-schema below
projects	ProjectObject[] — see sub-schema below
availability	AvailabilityObject — see sub-schema below
socialLinks	SocialLinksObject — see sub-schema below
resumeUrl	String — uploaded PDF URL (external source only)
rawResumeText	String — extracted text from PDF (external source only)
createdAt / updatedAt	Date — timestamps
SkillObject sub-schema
Field	Type · Description
name	String, required · e.g. 'Node.js'
level	Enum: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
yearsOfExperience	Number · years using this skill
LanguageObject sub-schema
Field	Type · Description
name	String, required · e.g. 'English'
proficiency	Enum: 'Basic' | 'Conversational' | 'Fluent' | 'Native'
ExperienceObject sub-schema
Field	Type · Description
company	String, required
role	String, required — job title (use 'role', not 'title')
startDate	String — format YYYY-MM
endDate	String — format YYYY-MM or 'Present'
description	String — responsibilities and achievements
technologies	String[] — tools used in this role
isCurrent	Boolean
EducationObject sub-schema
Field	Type · Description
institution	String, required
degree	String — e.g. 'Bachelor's', 'Master's', 'PhD'
fieldOfStudy	String — field or major
startYear	Number
endYear	Number — omit if ongoing
CertificationObject sub-schema
Field	Type · Description
name	String — certification title
issuer	String — issuing body
issueDate	String — format YYYY-MM
ProjectObject sub-schema
Field	Type · Description
name	String, required — project name
description	String — what it does and candidate's contribution
technologies	String[] — tools used
role	String — candidate's role on the project
link	String — live URL or repo link
startDate	String — format YYYY-MM
endDate	String — format YYYY-MM
AvailabilityObject sub-schema
Field	Type · Description
status	Enum: 'Available' | 'Open to Opportunities' | 'Not Available'
type	Enum: 'Full-time' | 'Part-time' | 'Contract'
startDate	String — format YYYY-MM-DD · optional
SocialLinksObject sub-schema
Field	Type · Description
linkedin	String — LinkedIn URL
github	String — GitHub URL
portfolio	String — personal website URL
4.4 Screenings Collection
Field	Type & Description
_id	ObjectId — primary key
jobId	ObjectId → jobs, required
triggeredBy	ObjectId → users
status	Enum: 'pending' | 'processing' | 'completed' | 'failed'
totalApplicants	Number — count evaluated
shortlistSize	Number — 10 or 20
results	ScreeningResult[] — ranked candidates (see below)
aiModelVersion	String — Gemini model used
promptVersion	String — internal prompt version tag
processingTimeMs	Number — total AI call duration
errorMessage	String — populated on failure
createdAt / updatedAt	Date — timestamps
ScreeningResult sub-schema (embedded in screenings.results)
Field	Type & Description
rank	Number — 1 = best match
applicantId	ObjectId → applicants
applicantName	String — firstName + lastName (denormalised)
overallScore	Number (0–100) — composite weighted score
skillsScore	Number (0–100) — skills match sub-score
experienceScore	Number (0–100) — experience match sub-score
educationScore	Number (0–100) — education match sub-score
relevanceScore	Number (0–100) — overall relevance sub-score
strengths	String[] — bullet-ready strength points from AI
gaps	String[] — identified gaps or risks
recommendation	String — final AI narrative paragraph
isShortlisted	Boolean — true for top N candidates
4.5 MongoDB Indexes
Collection	Index Fields	Purpose
jobs	createdBy, status	List jobs by recruiter
applicants	jobId, source	Fetch applicants for a job
applicants	email + jobId (unique)	Prevent duplicate applications
screenings	jobId, status	Fetch screening state
screenings	createdAt desc	Pagination of history
5. TypeScript Type Definitions
Place these in src/types/talent.ts. All field names match the official Umurava schema.

```typescript
// src/types/talent.ts

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export type LanguageProficiency = 'Basic' | 'Conversational' | 'Fluent' | 'Native';

export type AvailabilityStatus = 'Available' | 'Open to Opportunities' | 'Not Available';

export type AvailabilityType = 'Full-time' | 'Part-time' | 'Contract';

export interface Skill {
  name: string;
  level: SkillLevel;
  yearsOfExperience: number;
}

export interface Language {
  name: string;
  proficiency: LanguageProficiency;
}

export interface Experience {
  company: string;
  role: string; // 'role' not 'title' — matches Umurava schema
  startDate: string; // YYYY-MM
  endDate: string; // YYYY-MM or 'Present'
  description: string;
  technologies: string[];
  isCurrent: boolean;
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy: string; // 'fieldOfStudy' — matches Umurava schema
  startYear: number;
  endYear?: number;
}

export interface Certification {
  name: string;
  issuer: string;
  issueDate: string; // YYYY-MM
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  role: string;
  link?: string;
  startDate: string;
  endDate?: string;
}

export interface Availability {
  status: AvailabilityStatus;
  type: AvailabilityType;
  startDate?: string; // YYYY-MM-DD
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

// Full talent profile — mirrors the official Umurava schema
export interface TalentProfile {
  _id?: string;
  jobId: string;
  source: 'umurava' | 'external';
  umuravaProfileId?: string;
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  bio?: string;
  location: string;
  skills: Skill[];
  languages?: Language[];
  experience: Experience[];
  education: Education[];
  certifications?: Certification[];
  projects: Project[];
  availability: Availability;
  socialLinks?: SocialLinks;
  resumeUrl?: string;
  rawResumeText?: string;
}
## 6. Core Logic
6.1 Candidate Scoring Algorithm
The scoring engine computes a composite score (0–100) using these weighted dimensions:

Dimension	Weight & Logic
Skills Match	40% — compare job.requiredSkills against applicant.skills[].name; boost for level='Expert' or 'Advanced'
Experience Relevance	30% — total years derived from experience[].startDate/endDate; domain match via technologies[]
Education Level	15% — degree field vs. job.educationLevel requirement
Profile Completeness	15% — penalise missing required fields: projects, experience, availability
Skills Match Logic — Using Official Schema Fields
Normalise job.requiredSkills and applicant.skills[].name to lowercase

Base match: Jaccard similarity on skill names

Level multiplier:

Expert = 1.0x

Advanced = 0.85x

Intermediate = 0.65x

Beginner = 0.4x

Bonus: +5 points if nice-to-have skills appear in skills[].name

Fuzzy match: 'React.js' and 'ReactJS' treated as equivalent

Experience Relevance — Using Official Schema Fields
Calculate totalYears: sum of months from experience[].startDate to experience[].endDate (or today if isCurrent = true)

If totalYears >= job.minExperienceYears → full 30 points

Partial: (totalYears / job.minExperienceYears) * 30

Domain bonus: +5 if experience[].technologies overlap with job.requiredSkills

Project Relevance Bonus
If projects[].technologies overlap with job.requiredSkills → +3 bonus points

This rewards candidates who have built real things with the required stack

6.2 AI Prompt Engineering
The Gemini API prompt uses exact field names from the official Umurava schema so the model can reference them unambiguously:

```text
SYSTEM PROMPT (v2 — Umurava schema aligned):

You are an expert technical recruiter for the Umurava platform.

Evaluate the following candidates for the job below.

Return ONLY valid JSON. No markdown. No explanation outside the JSON.

JOB:
Title: {job.title}
Required Skills: {job.requiredSkills}
Min Experience: {job.minExperienceYears} years
Employment Type: {job.employmentType}
Description: {job.description}

CANDIDATES (array of Umurava talent profiles):
{candidates}

Each candidate has these fields:
firstName, lastName, headline,
skills[]{name,level,yearsOfExperience},
experience[]{company,role,startDate,endDate,technologies,isCurrent},
education[]{institution,degree,fieldOfStudy},
projects[]{name,technologies,role}, availability{status,type}

Scoring weights: Skills 40%, Experience 30%, Education 15%, Completeness 15%.

For skills, use level values: Expert=1.0x, Advanced=0.85x, Intermediate=0.65x, Beginner=0.4x.

Return JSON: { results: [ {
  applicantId, overallScore, skillsScore, experienceScore,
  educationScore, relevanceScore,
  strengths (array of strings), gaps (array of strings),
  recommendation (string, 50-150 words)
} ] }

Sort by overallScore descending. Evaluate ALL candidates.
6.3 Screening State Machine
State	Description & Transitions
pending	Screening record created, applicants fetched — moves to 'processing' immediately
processing	AI API call in flight — frontend polls every 3 seconds
completed	AI returned valid results — recruiter can view shortlist
failed	AI call errored or JSON parse failed — errorMessage populated, retry available
6.4 Resume Parsing for External Applicants (Scenario 2)
External applicants must be normalised into the Umurava schema before screening. Use Gemini multimodal for PDF parsing:

text
PDF PARSING PROMPT:

Parse this resume and return a JSON object matching the Umurava Talent Profile Schema.

Use these exact field names:
firstName, lastName, email, headline, bio, location,
skills[]{name, level, yearsOfExperience},
languages[]{name, proficiency},
experience[]{company, role, startDate, endDate, description, technologies, isCurrent},
education[]{institution, degree, fieldOfStudy, startYear, endYear},
certifications[]{name, issuer, issueDate},
projects[]{name, description, technologies, role, link, startDate, endDate},
availability{status, type},
socialLinks{linkedin, github, portfolio}

For skill level, infer from context: Expert/Advanced/Intermediate/Beginner.

Return ONLY valid JSON. No markdown.
## 7. Inclusion Insights

The Inclusion Insights module gives recruiters a fast, AI-assisted read on how balanced each shortlist is before they share it with stakeholders.

### 7.1 User Experience

- **Entry point:** A dedicated "Inclusion Insights" button appears on every completed screening within the Jobs Workspace shortlist view @components/workspace/JobsWorkspace.tsx#239-1385.
- **Modal presentation:** Clicking the entry point opens a glassmorphism modal with motion-powered cards @components/workspace/InclusionInsightsModal.tsx#1-183.
- **State handling:** The modal supports loading, error, and success states with graceful fallbacks, including a retry action for transient API failures @components/workspace/InclusionInsightsModal.tsx#108-176.
- **CSV context:** When insights are available, the shortlist export continues to include the qualitative insight tokens to preserve context in offline reviews @components/workspace/JobsWorkspace.tsx#1225-1237.

### 7.2 Metrics & Output Schema

- **Inclusion Score (0–100):** Rounded percentage that quantifies perceived balance across the shortlist.
- **Skill Diversity Index (0–100):** Highlights variation in technical skillsets represented.
- **Education Neutrality:** Text classification indicating the mix between traditional and non-traditional educational backgrounds.
- **Inclusion Summary:** Short narrative explaining why the ranking remains merit-first.
- **Justification:** Optional 200-character rationale retained for audit trails.
- **Source Metadata:** Responses are tagged with the Gemini model source when present.

A shared TypeScript contract documents this payload as `InclusionInsightsReport` @src/types/insights.ts#1-13.

### 7.3 Backend Orchestration

- **Endpoint:** `POST /api/shortlist/insights` receives the shortlist array and an identifier @app/api/shortlist/insights/route.ts#113-164.
- **Gemini fallback chain:** The route deduplicates model candidates and retries transient failures with exponential backoff @app/api/shortlist/insights/route.ts#5-111.
- **Response sanitation:** The handler strips fences, parses JSON fragments, clamps numeric values to safe ranges, and slices long prose fields before returning the report @app/api/shortlist/insights/route.ts#65-158.
- **Error handling:** Clear 4xx responses guard against invalid input, while unavailable Gemini credentials surface a 503 status.

### 7.4 Trigger Conditions & Persistence

- Insights are requested on-demand per shortlist and cached in component state; subsequent opens skip the network call unless another screening is selected @components/workspace/JobsWorkspace.tsx#1293-1361.
- The feature intentionally avoids server-side persistence today; future iterations may snapshot insights alongside screening results for auditability.

## 8. API Design
All endpoints prefixed with /api. JWT Bearer token authentication. Responses: { success, data, error }.

7.1 Auth
Endpoint	Description
POST /api/auth/register	Create recruiter — body: { name, email, password, organisation }
POST /api/auth/login	Returns JWT — body: { email, password }
POST /api/auth/refresh	Refresh JWT — body: { refreshToken }
7.2 Jobs
Endpoint	Description
GET /api/jobs	List jobs — ?status=open&page=1&limit=20
POST /api/jobs	Create job — full job schema (section 4.2)
GET /api/jobs/:id	Single job with latest screening status
PATCH /api/jobs/:id	Partial update
DELETE /api/jobs/:id	Soft-delete — sets status to 'closed'
7.3 Applicants
Endpoint	Description
GET /api/jobs/:jobId/applicants	List applicants — ?source=external
POST /api/jobs/:jobId/applicants	Add single Umurava-schema applicant
POST /api/jobs/:jobId/applicants/import/csv	Bulk CSV/Excel import — normalised to Umurava schema
POST /api/jobs/:jobId/applicants/import/pdf	Upload PDF — parsed and normalised to Umurava schema
DELETE /api/jobs/:jobId/applicants/:id	Remove applicant from pool
7.4 Screenings
Endpoint	Description
POST /api/screenings	Trigger screening — body: { jobId }
GET /api/screenings/:id	Status + results when complete
GET /api/jobs/:jobId/screenings	Screening history
POST /api/screenings/:id/retry	Retry failed screening
## 9. Development Tasks & Sub-Tasks
Tasks divided by role. Complexity: S = 2–4 hrs, M = 4–8 hrs, L = 1–2 days. All tasks reference the official Umurava schema field names.

FRONTEND ENGINEER
8.1 Frontend Tasks
TASK FE-01 — Project Setup & Design System [S]

Initialise Next.js 14 with App Router and TypeScript

bash
npx create-next-app@latest --typescript --tailwind --app
Configure path aliases: @/components, @/lib, @/store, @/types

Add Rwanda colour palette to tailwind.config.ts

theme.extend.colors.rwanda: sky, hills, gold, imigongo, night and all tints

Never use default Tailwind blues or greens — only rwanda.* tokens

Install and configure shadcn/ui — Button, Input, Select, Badge, Card, Table, Skeleton, Toast

Set up Redux Toolkit — slices: authSlice, jobsSlice, applicantsSlice, screeningsSlice

Create Axios instance with base URL and JWT Bearer interceptor

Create src/types/talent.ts with all TypeScript interfaces from section 5

TASK FE-02 — Authentication UI [S]

Build /login and /register pages with client-side validation

JWT stored in httpOnly cookie

useAuth hook reading from authSlice

Protected route middleware in Next.js middleware.ts

TASK FE-03 — Jobs Management UI [M]

Build /jobs list page — status badges using Rwanda colour tokens:

draft = gray (rwanda.night)

open = rwanda.sky

screening = rwanda.gold

closed = rwanda.hills

Build multi-step job creation form — basic info, requirements, screening config

Build /jobs/[id] detail page with tabs: Overview | Applicants | Screenings

TASK FE-04 — Applicant Ingestion UI [M]

Umurava profiles tab: display firstName + lastName, headline, skills chips, availability badge

Skills chip colour:

Expert = rwanda.night

Advanced = rwanda.sky

Intermediate = rwanda.gold

Beginner = rwanda.imigongo

External upload panel: CSV/Excel drag-and-drop, column mapper to Umurava schema fields

Column mapper must map to official field names: firstName, lastName, role (not title), fieldOfStudy (not field), etc.

PDF upload for single external applicant

TASK FE-05 — Screening Trigger & Status UI [M]

'Run AI Screening' button — disabled if < 2 applicants

Polling hook: useScreeningPoller(screeningId) — polls every 3s until completed/failed

Status banner using Rwanda gold for 'processing', green for 'completed', red for 'failed'

TASK FE-06 — Shortlist & Results UI [L]

Candidate card design:

Header: rank badge (rwanda.gold bg), name from firstName + lastName, headline, overallScore gauge

Score bars: Skills (rwanda.hills), Experience (rwanda.hills), Education (rwanda.gold), Relevance (rwanda.hills)

Strengths: rwanda.hills-tint bg with green checkmarks

Gaps: rwanda.imigongo-tint bg with red left border

Recommendation paragraph: rwanda.sky-tint block

Show availability.status and availability.type badges on each card

Show skills with level badges (Expert/Advanced/Intermediate/Beginner)

Toggle card/table view, export CSV, 3-way comparison mode

TASK FE-07 — Polish & Responsiveness [S]

Responsive down to 375px mobile

Skeleton loaders for all data-fetched components

Toast system: success = rwanda.hills, error = rwanda.imigongo, info = rwanda.sky

Lighthouse: Performance > 80, Accessibility > 90

BACKEND ENGINEER
8.2 Backend Tasks
TASK BE-01 — Project Setup [S]

Node.js + TypeScript, Express, helmet, cors, morgan, rate-limit

Connect to MongoDB Atlas via Mongoose

Define all Mongoose models from section 4 using official schema field names

Critical: use 'role' not 'title' in Experience; 'fieldOfStudy' not 'field' in Education

Import TalentProfile interface from src/types/talent.ts into all model files

TASK BE-02 — Auth Module [S]

POST /api/auth/register — bcrypt hash (rounds: 12), create user

POST /api/auth/login — verify, return JWT (7d expiry)

verifyToken middleware, requireRole guard

TASK BE-03 — Jobs Module [M]

Full CRUD per section 7.2 with Zod validation

Filtering and pagination: ?status, ?page, ?limit

TASK BE-04 — Applicants Module [M]

CRUD endpoints per section 7.3

CSV/Excel import: map columns to official Umurava schema fields

Enforce 'role' field name for experience entries, not 'title'

Enforce 'fieldOfStudy' for education entries, not 'field'

PDF upload: store in Cloudinary, extract text, store in rawResumeText

Upsert by email + jobId to prevent duplicates

TASK BE-05 — AI Orchestration Service [L]

Create src/services/screeningService.ts

Fetch applicants from MongoDB — ensure all official schema fields are populated

Build AI prompt from template in section 6.2 — inject applicants as Umurava schema JSON

Parse Gemini JSON response, validate with Zod against ScreeningResult schema

3-attempt retry with exponential backoff (1s, 2s, 4s)

Persist results to screenings collection

TASK BE-06 — Screenings Module [M]

Full endpoint set per section 7.4

Block duplicate concurrent screenings for same job

POST /api/screenings/:id/retry — reset to pending, re-trigger service

TASK BE-07 — Security & Hardening [S]

Rate limit: 100 req/15min global, 5 req/min on auth

CORS: allow only deployed frontend origin

Structured JSON logging with Winston

GET /api/health endpoint for deployment checks

AI / PROMPT ENGINEER
8.3 AI Engineering Tasks
TASK AI-01 — Gemini API Integration [S]

Install @google/generative-ai SDK

Create src/lib/geminiClient.ts — initialise with API key

Test basic call with sample job and 3 Umurava-schema profiles

TASK AI-02 — Prompt Engineering [M]

Implement and iterate the v2 prompt from section 6.2

Verify model correctly uses skills[].level multipliers (Expert=1.0x, Beginner=0.4x)

Verify model references experience[].role (not title) and education[].fieldOfStudy correctly

Test with 3 job types: engineering, design, data science

Document prompt decisions in README

TASK AI-03 — Dummy Data Generation [M]

Generate 30+ profiles strictly following the official Umurava schema

All skill levels from official enum: Beginner | Intermediate | Advanced | Expert

All language proficiency from official enum: Basic | Conversational | Fluent | Native

All availability status from official enum: Available | Open to Opportunities | Not Available

Use 'role' not 'title' in experience; 'fieldOfStudy' not 'field' in education; 'issueDate' in certifications

Cover diverse roles and seniority: junior, mid, senior

Store in /data/seed — write Mongoose seed script

TASK AI-04 — Multi-Candidate Testing [M]

Test with 5, 10, 20 candidates — verify distinct scores and sensible rank order

Test edge: all candidates Expert in all required skills — verify differentiation via experience and projects

Calculate context window limits for 20 candidates with full Umurava profiles

If token limit is exceeded, implement batching: split into groups of 10, merge ranks

TASK AI-05 — Resume Parsing [M]

Implement PDF → Umurava schema extraction using prompt in section 6.4

Test with 5 resume formats — verify output uses official field names

Validate: skills[].level must be one of the official enum values

Handle edge cases: image-only PDFs, non-English resumes

TASK AI-06 — Output Validation [S]

Zod schema for ScreeningResult validation

Ensure strengths and gaps arrays have 2–5 items each

Ensure recommendation is 50–150 words

Log aiModelVersion and promptVersion on every screening

FULL TEAM
8.4 Integration & Deployment
TASK OPS-01 — Environment Setup [S]

Create .env.example with all required variables

GitHub repo with main/develop/feature/* branch strategy

Deploy to Vercel (frontend) and Railway/Render (backend)

MongoDB Atlas M0 cluster — whitelist backend IPs

TASK OPS-02 — End-to-End Testing [M]

Scenario 1 full flow: job → Umurava profiles (official schema) → AI screening → shortlist

Scenario 2 full flows: CSV import → normalise to schema → screen; PDF upload → parse → screen

Verify AI reasoning references skills by name and experience by role correctly

Test retry flow: fail → retry → success

TASK OPS-03 — Documentation & Demo [M]

README: overview, architecture, setup, env vars, AI flow, schema notes, limitations

Note in README: all profiles follow official Umurava Talent Profile Schema Specification v1

2-minute demo video covering both scenarios

2-slide deck: slide 1 = product demo, slide 2 = AI decision flow using official schema fields

## 10. Environment Variables Reference
9.1 Backend (.env)
Variable	Description
PORT	Server port, default 4000
MONGODB_URI	MongoDB Atlas connection string
JWT_SECRET	Strong random secret, min 32 chars
JWT_REFRESH_SECRET	Separate secret for refresh tokens
GEMINI_API_KEY	Google AI Studio API key — mandatory
GEMINI_MODEL	e.g. gemini-1.5-pro
CLOUDINARY_URL	Cloudinary URL for resume storage
CORS_ORIGIN	Frontend URL e.g. https://umurava-ai.vercel.app
NODE_ENV	development | production
9.2 Frontend (.env.local)
Variable	Description
NEXT_PUBLIC_API_URL	Backend base URL
NEXT_PUBLIC_APP_NAME	e.g. Umurava AI Screening
## 11. Assumptions & Limitations
10.1 Schema Compliance
All dummy profiles and real Umurava profiles must use the exact field names from the official schema specification

The AI prompt references skills[].level, experience[].role, education[].fieldOfStudy — if field names drift, scoring breaks silently

External CSV/Excel imports must be mapped to official field names before storage — column mapper UI enforces this

10.2 Technical Assumptions
Gemini API returns valid JSON when prompted with 'Return ONLY valid JSON' — retry handles transient failures

MongoDB Atlas free tier (M0, 512MB) is sufficient for hackathon volumes

A single Gemini call handles up to 20 full Umurava profiles before context window risk

PDF text extraction degrades for image-only or scanned PDFs

10.3 AI Limitations
Scoring is heuristic — the model may weigh factors differently from a human recruiter

Skill level inference (Expert/Advanced/etc.) from PDF text is approximate

The AI cannot verify claimed experience or certifications — it trusts the profile data

Bias risk: AI may inherit patterns from Gemini training data — all outputs should be reviewed by a recruiter

10.4 Design Decisions
JWT stored in httpOnly cookie to mitigate XSS risk

Applicants are soft-deleted (isDeleted flag) to preserve screening history

Screening is always manually triggered — no auto-screening on upload

All AI output is a recommendation — no automated candidate rejection occurs

Appendix: Quick Reference
Rwanda Colour Palette
Token	Usage
rwanda.sky	Primary actions, info banners
rwanda.hills	Success, positive scores
rwanda.gold	Warnings, processing states, rank badges
rwanda.imigongo	Errors, gaps, destructive actions
rwanda.night	Text, borders, neutral elements
Key Schema Field Mappings
Old/Incorrect	Correct (Umurava Schema)
title (in experience)	role
field (in education)	fieldOfStudy
issuedDate	issueDate
years (in skills)	yearsOfExperience
jobTitle	role
End of Technical Documentation v2.0

For questions or support: competence@umurava.africa
````
