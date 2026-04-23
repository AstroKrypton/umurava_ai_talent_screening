import { performance } from "node:perf_hooks";
import { z } from "zod";
import type { Job, ScreeningResult, TalentProfile } from "@/src/types/talent";

const scoreSchema = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  },
  z
    .number()
    .min(0, "Scores cannot be negative")
    .max(100, "Scores cannot exceed 100"),
);

const candidateIndexSchema = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  },
  z
    .number()
    .int("candidateIndex must be an integer")
    .min(0, "candidateIndex must be zero or greater"),
);

export const geminiResultSchema = z.object({
  results: z
    .array(
      z.object({
        candidateIndex: candidateIndexSchema,
        overallScore: scoreSchema,
        skillsScore: scoreSchema,
        experienceScore: scoreSchema,
        educationScore: scoreSchema,
        relevanceScore: scoreSchema,
        strengths: z.array(z.string()).default([]),
        gaps: z.array(z.string()).default([]),
        recommendation: z.string().min(20),
        isShortlisted: z.boolean().optional(),
        insights: z.array(z.string()).optional(),
      }),
    )
    .min(1, "At least one result required"),
});

export type GeminiResultPayload = z.infer<typeof geminiResultSchema>;

const SYSTEM_LIMIT_MESSAGE =
  "The AI reasoning for this large pool was too brief to meet quality standards. Please reduce your applicant pool to 20 or fewer, or implement batching.";

export class ScreeningSystemLimitError extends Error {
  readonly status = 400;
  readonly body = {
    success: false as const,
    message: SYSTEM_LIMIT_MESSAGE,
  };

  constructor() {
    super(SYSTEM_LIMIT_MESSAGE);
    this.name = "ScreeningSystemLimitError";
  }
}

export function parseScreeningResponsePayload(payload: unknown): GeminiResultPayload {
  try {
    return geminiResultSchema.parse(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const hasRecommendationIssue = error.issues.some((issue) => {
        if (!issue.path || issue.path.length === 0) return false;
        const lastSegment = issue.path[issue.path.length - 1];
        return (
          lastSegment === "recommendation" &&
          (issue.code === "too_small" || issue.message.toLowerCase().includes("recommendation"))
        );
      });

      if (hasRecommendationIssue) {
        throw new ScreeningSystemLimitError();
      }
    }

    throw error;
  }
}

export type JobForScreening = Pick<
  Job,
  | "_id"
  | "title"
  | "requiredSkills"
  | "niceToHaveSkills"
  | "minExperienceYears"
  | "educationLevel"
  | "shortlistSize"
  | "employmentType"
  | "description"
  | "location"
> & {
  _id: string;
};

export type ApplicantForScreening = Pick<
  TalentProfile,
  | "_id"
  | "firstName"
  | "lastName"
  | "headline"
  | "skills"
  | "experience"
  | "education"
  | "projects"
  | "availability"
  | "languages"
  | "location"
  | "certifications"
> & {
  _id: string;
};

type ComputedScores = {
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  completenessScore: number;
  relevanceScore: number;
  overallScore: number;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  bonuses: {
    domainBonus: number;
    projectBonus: number;
    availabilityBonus: number;
    locationBonus: number;
  };
  insights: string[];
  signals: SupplementalSignals;
};

type InsightSignal = {
  bonus: number;
  strengths: string[];
  gaps: string[];
  insights: string[];
};

type SupplementalSignals = {
  availability: InsightSignal;
  location: InsightSignal;
  languageInsight?: string;
  certificationInsight?: string;
};

const SKILL_LEVEL_MULTIPLIER: Record<string, number> = {
  beginner: 0.4,
  intermediate: 0.65,
  advanced: 0.85,
  expert: 1,
};

const EDUCATION_LEVEL_ORDER: Record<JobForScreening["educationLevel"], number> =
  {
    any: 0,
    bachelor: 1,
    master: 2,
    phd: 3,
  };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeSkillName(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function monthDiff(start: string, end: string) {
  const [startYear, startMonth] = start
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  if (!Number.isFinite(startYear) || !Number.isFinite(startMonth)) return 0;

  let effectiveEnd = end;
  if (!effectiveEnd || effectiveEnd.toLowerCase() === "present") {
    const now = new Date();
    effectiveEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  const [endYear, endMonth] = effectiveEnd
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  if (!Number.isFinite(endYear) || !Number.isFinite(endMonth)) return 0;

  return (endYear - startYear) * 12 + (endMonth - startMonth);
}

function calculateSkillsScore(
  job: JobForScreening,
  applicant: ApplicantForScreening,
) {
  if (job.requiredSkills.length === 0)
    return { score: 100, niceToHaveBonus: 0 };

  const normalizedApplicantSkills = new Map<
    string,
    ApplicantForScreening["skills"][number]
  >();
  for (const skill of applicant.skills) {
    normalizedApplicantSkills.set(normalizeSkillName(skill.name), skill);
  }

  let accumulatedMultiplier = 0;
  for (const requiredSkill of job.requiredSkills) {
    const normalized = normalizeSkillName(requiredSkill);
    const applicantSkill = normalizedApplicantSkills.get(normalized);
    if (applicantSkill) {
      const multiplier =
        SKILL_LEVEL_MULTIPLIER[applicantSkill.level.toLowerCase()] ?? 0.6;
      accumulatedMultiplier += multiplier;
    }
  }

  const baseScore = (accumulatedMultiplier / job.requiredSkills.length) * 100;

  const niceToHaveBonus = job.niceToHaveSkills.some((skill) =>
    normalizedApplicantSkills.has(normalizeSkillName(skill)),
  )
    ? 5
    : 0;

  return { score: clamp(baseScore + niceToHaveBonus, 0, 100), niceToHaveBonus };
}

function calculateExperienceScore(
  job: JobForScreening,
  applicant: ApplicantForScreening,
) {
  if (
    !Array.isArray(applicant.experience) ||
    applicant.experience.length === 0
  ) {
    return { score: 0, domainBonus: 0 };
  }

  let totalMonths = 0;
  let domainOverlap = false;
  const normalizedRequiredSkills = new Set(
    job.requiredSkills.map(normalizeSkillName),
  );

  for (const experience of applicant.experience) {
    totalMonths += Math.max(
      0,
      monthDiff(experience.startDate, experience.endDate),
    );

    if (!domainOverlap && experience.technologies) {
      for (const tech of experience.technologies) {
        if (normalizedRequiredSkills.has(normalizeSkillName(tech))) {
          domainOverlap = true;
          break;
        }
      }
    }
  }

  const totalYears = totalMonths / 12;
  if (job.minExperienceYears <= 0) {
    return { score: 100, domainBonus: domainOverlap ? 5 : 0 };
  }

  const ratio = clamp(totalYears / job.minExperienceYears, 0, 1);
  const baseScore = ratio * 100;

  return {
    score: clamp(baseScore + (domainOverlap ? 5 : 0), 0, 100),
    domainBonus: domainOverlap ? 5 : 0,
  };
}

function calculateEducationScore(
  job: JobForScreening,
  applicant: ApplicantForScreening,
) {
  if (!Array.isArray(applicant.education) || applicant.education.length === 0)
    return 0;

  const requirementLevel = EDUCATION_LEVEL_ORDER[job.educationLevel] ?? 0;
  const applicantLevel = Math.max(
    ...applicant.education.map((item) => {
      const normalizedDegree = item.degree.toLowerCase();
      if (normalizedDegree.includes("phd")) return 3;
      if (normalizedDegree.includes("master")) return 2;
      if (normalizedDegree.includes("bachelor")) return 1;
      return 0;
    }),
  );

  if (requirementLevel === 0) return 100;

  const ratio = clamp((applicantLevel + 1) / (requirementLevel + 1), 0, 1);
  return ratio * 100;
}

function calculateCompletenessScore(applicant: ApplicantForScreening) {
  let missing = 0;
  if (!applicant.experience || applicant.experience.length === 0) missing += 1;
  if (!applicant.projects || applicant.projects.length === 0) missing += 1;
  if (!applicant.availability) missing += 1;

  const completenessRatio = (3 - missing) / 3;
  return clamp(completenessRatio * 100, 0, 100);
}

function calculateProjectBonus(
  job: JobForScreening,
  applicant: ApplicantForScreening,
) {
  if (!Array.isArray(applicant.projects) || applicant.projects.length === 0)
    return 0;
  const normalizedRequiredSkills = new Set(
    job.requiredSkills.map(normalizeSkillName),
  );

  for (const project of applicant.projects) {
    for (const tech of project.technologies) {
      if (normalizedRequiredSkills.has(normalizeSkillName(tech))) {
        return 3;
      }
    }
  }

  return 0;
}

function capitalize(value: string) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseAvailabilityStartDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysUntil(date: Date) {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function normaliseLocation(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function evaluateAvailabilitySignal(
  job: JobForScreening,
  applicant: ApplicantForScreening,
): InsightSignal {
  const strengths: string[] = [];
  const gaps: string[] = [];
  const insights: string[] = [];
  let bonus = 0;

  const availability = applicant.availability ?? {
    status: "Open to Opportunities",
    type: "Full-time",
  };

  const status = availability.status?.toLowerCase() ?? "";
  const type = availability.type?.toLowerCase() ?? "";
  const jobType = job.employmentType?.toLowerCase?.() ?? "";

  if (status.includes("immediate") || status.includes("available now")) {
    const message = "Ready to start immediately";
    strengths.push(message);
    insights.push(message);
    bonus += 4;
  }

  const startDate = parseAvailabilityStartDate(availability.startDate);
  if (startDate) {
    const days = daysUntil(startDate);
    if (days <= 14) {
      const message = "Can start within two weeks";
      strengths.push(message);
      insights.push(message);
      bonus += 3;
    } else if (days <= 30) {
      const message = "Available to start within a month";
      insights.push(message);
      bonus += 1;
    } else if (days > 60) {
      gaps.push("Availability begins more than 60 days out.");
    }
  }

  if (type && jobType) {
    if (type === jobType) {
      const message = `Prefers ${capitalize(job.employmentType)} engagements, matching the role.`;
      strengths.push(message);
      insights.push(message);
      bonus += 2;
    } else {
      gaps.push(
        `Prefers ${capitalize(availability.type)} work while the role is ${capitalize(job.employmentType)}.`,
      );
    }
  }

  if (!availability.status) {
    gaps.push("Availability status missing or unclear.");
  }

  return {
    bonus: clamp(bonus, 0, 8),
    strengths,
    gaps,
    insights,
  };
}

function evaluateLocationSignal(
  job: JobForScreening,
  applicant: ApplicantForScreening,
): InsightSignal {
  const strengths: string[] = [];
  const gaps: string[] = [];
  const insights: string[] = [];
  let bonus = 0;

  const jobLocation = job.location?.trim() ?? "";
  const applicantLocation = applicant.location?.trim() ?? "";

  if (!jobLocation) {
    if (applicantLocation) {
      insights.push(`Based in ${applicant.location}`);
    }
    return { bonus, strengths, gaps, insights };
  }

  const isRemoteRole = /remote/i.test(jobLocation);
  const isRemoteApplicant = /remote/i.test(applicantLocation);

  if (isRemoteRole) {
    if (applicantLocation) {
      const message = `Remote-ready from ${applicant.location}`;
      strengths.push(message);
      insights.push(message);
    } else {
      insights.push("Remote role; candidate location not provided");
    }
    bonus += 2;
    return {
      bonus: clamp(bonus, 0, 5),
      strengths,
      gaps,
      insights,
    };
  }

  if (!applicantLocation) {
    gaps.push(`Role targets ${job.location}; candidate location not provided.`);
    insights.push(`Role targets ${job.location}; candidate location not provided.`);
    return { bonus, strengths, gaps, insights };
  }

  const normalizedJob = normaliseLocation(jobLocation);
  const normalizedApplicant = normaliseLocation(applicantLocation);

  if (
    normalizedJob.length > 0 &&
    normalizedApplicant.length > 0 &&
    (normalizedApplicant.includes(normalizedJob) || normalizedJob.includes(normalizedApplicant))
  ) {
    const message = `Based in ${applicant.location}, aligned with ${job.location}`;
    strengths.push(message);
    insights.push(message);
    bonus += 4;
  } else if (!isRemoteApplicant) {
    const message = `Based in ${applicant.location} while the role is located in ${job.location}`;
    gaps.push(message);
    insights.push(message);
  }

  return {
    bonus: clamp(bonus, 0, 6),
    strengths,
    gaps,
    insights,
  };
}

function buildLanguageInsight(applicant: ApplicantForScreening) {
  if (!Array.isArray(applicant.languages) || applicant.languages.length === 0)
    return undefined;

  const summary = applicant.languages
    .slice(0, 3)
    .map((language) =>
      language.proficiency
        ? `${language.name} (${language.proficiency})`
        : language.name,
    )
    .join(", ");

  return summary.length > 0 ? `Languages: ${summary}` : undefined;
}

function buildCertificationInsight(applicant: ApplicantForScreening) {
  if (!Array.isArray(applicant.certifications) || applicant.certifications.length === 0)
    return undefined;

  const summary = applicant.certifications
    .slice(0, 2)
    .map((cert) => (cert.issuer ? `${cert.name} (${cert.issuer})` : cert.name))
    .join(", ");

  return summary.length > 0 ? `Certifications: ${summary}` : undefined;
}

const MAX_INSIGHTS = 5;

function collectSupplementalSignals(
  job: JobForScreening,
  applicant: ApplicantForScreening,
): SupplementalSignals {
  return {
    availability: evaluateAvailabilitySignal(job, applicant),
    location: evaluateLocationSignal(job, applicant),
    languageInsight: buildLanguageInsight(applicant),
    certificationInsight: buildCertificationInsight(applicant),
  };
}

function aggregateInsights(signals: SupplementalSignals) {
  const insights: string[] = [];
  const seen = new Set<string>();

  for (const message of [
    ...signals.availability.insights,
    ...signals.location.insights,
  ]) {
    if (message && !seen.has(message)) {
      insights.push(message);
      seen.add(message);
    }
  }

  for (const optional of [signals.languageInsight, signals.certificationInsight]) {
    if (optional && !seen.has(optional)) {
      insights.push(optional);
      seen.add(optional);
    }
  }

  return insights.slice(0, MAX_INSIGHTS);
}

function buildStrengths(
  scores: ComputedScores,
  job: JobForScreening,
  applicant: ApplicantForScreening,
) {
  const strengths: string[] = [];

  if (scores.skillsScore >= 80) {
    strengths.push(
      `Strong alignment with ${job.requiredSkills.length > 0 ? "required skills" : "core skills"}, demonstrating immediate impact potential.`,
    );
  }

  if (scores.experienceScore >= 80) {
    strengths.push(
      "Relevant experience depth matches or exceeds role expectations.",
    );
  }

  if (scores.bonuses.projectBonus > 0) {
    strengths.push(
      "Project history shows hands-on delivery with the target stack.",
    );
  }

  for (const message of scores.signals.availability.strengths) {
    if (!strengths.includes(message)) strengths.push(message);
  }

  for (const message of scores.signals.location.strengths) {
    if (!strengths.includes(message)) strengths.push(message);
  }

  if (strengths.length === 0) {
    strengths.push(
      "Solid foundational profile with growth potential for the role.",
    );
  }

  return strengths.slice(0, 4);
}

function buildGaps(scores: ComputedScores, job: JobForScreening) {
  const gaps: string[] = [];

  if (scores.skillsScore < 65 && job.requiredSkills.length > 0) {
    gaps.push("Needs further alignment on the role's must-have skills.");
  }

  if (scores.experienceScore < 65 && job.minExperienceYears > 0) {
    gaps.push("Experience depth is below the requested minimum.");
  }

  if (scores.educationScore < 60 && job.educationLevel !== "any") {
    gaps.push("Formal education level is below the stated preference.");
  }

  if (scores.completenessScore < 70) {
    gaps.push(
      "Profile completeness can be improved (projects, experience, or availability details).",
    );
  }

  for (const message of scores.signals.availability.gaps) {
    if (!gaps.includes(message)) gaps.push(message);
  }

  for (const message of scores.signals.location.gaps) {
    if (!gaps.includes(message)) gaps.push(message);
  }

  if (gaps.length === 0) {
    gaps.push(
      "No significant gaps detected relative to the role expectations.",
    );
  }

  return gaps.slice(0, 4);
}

function buildRecommendation(
  scores: ComputedScores,
  job: JobForScreening,
  applicant: ApplicantForScreening,
) {
  const tone =
    scores.overallScore >= 80
      ? "Strong hire recommendation"
      : scores.overallScore >= 65
        ? "Move forward"
        : "Consider with caution";

  let recommendation = `${tone} for ${applicant.firstName} ${applicant.lastName}. Skills match score of ${Math.round(scores.skillsScore)} and overall relevance of ${Math.round(scores.relevanceScore)} suggest they can contribute meaningfully to the ${job.title} role. Address identified gaps during interviews to confirm fit.`;

  if (recommendation.length < 50) {
    recommendation = `${recommendation} Continue exploring their experience and cultural alignment to make an informed decision.`;
  }

  return recommendation;
}

function computeScores(
  job: JobForScreening,
  applicant: ApplicantForScreening,
): ComputedScores {
  const { score: skillsScore } = calculateSkillsScore(job, applicant);
  const { score: experienceScore, domainBonus } = calculateExperienceScore(
    job,
    applicant,
  );
  const educationScore = calculateEducationScore(job, applicant);
  const completenessScore = calculateCompletenessScore(applicant);
  const projectBonus = calculateProjectBonus(job, applicant);
  const supplementalSignals = collectSupplementalSignals(job, applicant);

  const relevanceScore =
    0.4 * skillsScore +
    0.3 * experienceScore +
    0.15 * educationScore +
    0.15 * completenessScore;
  const overallScore = clamp(
    relevanceScore +
      domainBonus +
      projectBonus +
      supplementalSignals.availability.bonus +
      supplementalSignals.location.bonus,
    0,
    100,
  );

  const insights = aggregateInsights(supplementalSignals);

  const placeholderScores: ComputedScores = {
    skillsScore,
    experienceScore,
    educationScore,
    completenessScore,
    relevanceScore,
    overallScore,
    strengths: [],
    gaps: [],
    recommendation: "",
    bonuses: {
      domainBonus,
      projectBonus,
      availabilityBonus: supplementalSignals.availability.bonus,
      locationBonus: supplementalSignals.location.bonus,
    },
    insights,
    signals: supplementalSignals,
  };

  placeholderScores.strengths = buildStrengths(
    placeholderScores,
    job,
    applicant,
  );
  placeholderScores.gaps = buildGaps(placeholderScores, job);
  placeholderScores.recommendation = buildRecommendation(
    placeholderScores,
    job,
    applicant,
  );

  return placeholderScores;
}

export function computeScreeningResults(
  job: JobForScreening,
  applicants: ApplicantForScreening[],
) {
  const startedAt = performance.now();

  const scoredApplicants = applicants.map((applicant) => {
    const scores = computeScores(job, applicant);

    return {
      applicantId: applicant._id,
      applicantName: `${applicant.firstName} ${applicant.lastName}`,
      overallScore: Math.round(scores.overallScore),
      skillsScore: Math.round(scores.skillsScore),
      experienceScore: Math.round(scores.experienceScore),
      educationScore: Math.round(scores.educationScore),
      relevanceScore: Math.round(scores.relevanceScore),
      strengths: scores.strengths,
      gaps: scores.gaps,
      recommendation: scores.recommendation,
      insights: scores.insights,
    };
  });

  const shortlistSize = job.shortlistSize || 10;
  const topApplicants = scoredApplicants
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, shortlistSize);

  const results: ScreeningResult[] = topApplicants.map((item, index) => ({
    rank: index + 1,
    applicantId: item.applicantId,
    applicantName: item.applicantName,
    overallScore: item.overallScore,
    skillsScore: item.skillsScore,
    experienceScore: item.experienceScore,
    educationScore: item.educationScore,
    relevanceScore: item.relevanceScore,
    strengths: item.strengths,
    gaps: item.gaps,
    recommendation: item.recommendation,
    isShortlisted: true,
    insights: item.insights,
  }));

  const processingTimeMs = Math.round(performance.now() - startedAt);

  return {
    results,
    processingTimeMs,
  };
}

function ensureArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function deriveApplicantInsights(
  job: JobForScreening,
  applicant: ApplicantForScreening,
) {
  const supplementalSignals = collectSupplementalSignals(job, applicant);
  return aggregateInsights(supplementalSignals);
}

export function toJobForScreening(
  job: Partial<Job> & { _id: unknown },
): JobForScreening {
  return {
    _id: String(job._id),
    title: job.title ?? "Untitled role",
    requiredSkills: ensureArray<string>(job.requiredSkills, []),
    niceToHaveSkills: ensureArray<string>(job.niceToHaveSkills, []),
    minExperienceYears:
      typeof job.minExperienceYears === "number" ? job.minExperienceYears : 0,
    educationLevel: (job.educationLevel ??
      "any") as JobForScreening["educationLevel"],
    shortlistSize: job.shortlistSize === 20 ? 20 : 10,
    employmentType: (job.employmentType ??
      "full-time") as JobForScreening["employmentType"],
    description: job.description ?? "",
    location: job.location ?? "",
  };
}

export function toApplicantsForScreening(
  applicants: Array<Partial<TalentProfile> & { _id: unknown }>,
): ApplicantForScreening[] {
  return applicants.map((applicant) => {
    const rawSkills = Array.isArray(applicant.skills) ? applicant.skills : [];
    const skills = rawSkills.map((skill) => {
      const normalised = skill as Partial<
        ApplicantForScreening["skills"][number]
      >;
      return {
        name: normalised.name ?? "",
        level: (normalised.level ??
          "Intermediate") as ApplicantForScreening["skills"][number]["level"],
        yearsOfExperience:
          typeof normalised.yearsOfExperience === "number" &&
          Number.isFinite(normalised.yearsOfExperience)
            ? normalised.yearsOfExperience
            : 0,
      };
    });

    const rawExperience = Array.isArray(applicant.experience)
      ? applicant.experience
      : [];
    const experience = rawExperience.map((item) => {
      const normalised = item as Partial<
        ApplicantForScreening["experience"][number]
      >;
      return {
        company: normalised.company ?? "",
        role: normalised.role ?? "",
        startDate: normalised.startDate ?? "",
        endDate: normalised.endDate ?? "",
        description: normalised.description ?? "",
        technologies: ensureArray<string>(normalised.technologies, []),
        isCurrent: Boolean(normalised.isCurrent),
      };
    });

    const rawEducation = Array.isArray(applicant.education)
      ? applicant.education
      : [];
    const education = rawEducation.map((item) => {
      const normalised = item as Partial<
        ApplicantForScreening["education"][number]
      >;
      return {
        institution: normalised.institution ?? "",
        degree: normalised.degree ?? "",
        fieldOfStudy: normalised.fieldOfStudy ?? "",
        startYear:
          typeof normalised.startYear === "number" ? normalised.startYear : 0,
        endYear:
          typeof normalised.endYear === "number"
            ? normalised.endYear
            : undefined,
      };
    });

    const rawProjects = Array.isArray(applicant.projects)
      ? applicant.projects
      : [];
    const projects = rawProjects.map((item) => {
      const normalised = item as Partial<
        ApplicantForScreening["projects"][number]
      >;
      return {
        name: normalised.name ?? "",
        description: normalised.description ?? "",
        technologies: ensureArray<string>(normalised.technologies, []),
        role: normalised.role ?? "",
        link: normalised.link ?? undefined,
        startDate: normalised.startDate ?? "",
        endDate: normalised.endDate ?? undefined,
      };
    });

    const availability = applicant.availability ?? {
      status: "Open to Opportunities",
      type: "Full-time",
    };

    const languages = Array.isArray(applicant.languages)
      ? (applicant.languages as ApplicantForScreening["languages"])
      : [];
    const certifications = Array.isArray(applicant.certifications)
      ? (applicant.certifications as ApplicantForScreening["certifications"])
      : [];

    return {
      _id: String(applicant._id),
      firstName: applicant.firstName ?? "",
      lastName: applicant.lastName ?? "",
      headline: applicant.headline ?? "",
      skills,
      experience,
      education,
      projects,
      availability,
      languages,
      location: applicant.location ?? "",
      certifications,
    };
  });
}


