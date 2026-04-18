import { performance } from "node:perf_hooks";
import {
  getGeminiModelByName,
  getGeminiModelName,
  isGeminiConfigured,
} from "@/src/lib/geminiClient";
import type { ScreeningResult } from "@/src/types/talent";
import {
  computeScreeningResults,
  deriveApplicantInsights,
  type GeminiResultPayload,
  parseScreeningResponsePayload,
  ScreeningSystemLimitError,
  type ApplicantForScreening,
  type JobForScreening,
} from "./screeningService";

const PROMPT_VERSION = "um-schema-v2";

export interface ScreeningExecutionResult {
  results: ScreeningResult[];
  processingTimeMs: number;
  aiModelVersion: string;
  promptVersion: string;
  usedFallback: boolean;
  errorMessage?: string;
}

function buildPrompt(job: JobForScreening, applicants: ApplicantForScreening[]) {
  const candidatesPayload = applicants.map((applicant) => ({
    applicantId: applicant._id,
    firstName: applicant.firstName,
    lastName: applicant.lastName,
    headline: applicant.headline,
    skills: applicant.skills,
    experience: applicant.experience,
    education: applicant.education,
    projects: applicant.projects,
    availability: applicant.availability,
    languages: applicant.languages,
  }));

  const jobSummary = `Title: ${job.title}\nRequired Skills: ${job.requiredSkills.join(", ")}\nMin Experience: ${job.minExperienceYears} years\nEmployment Type: ${job.employmentType}\nDescription: ${job.description}`;

  return `You are an expert technical recruiter for the Umurava platform.\n\nEvaluate the following candidates for the job below.\n\nReturn ONLY valid JSON. No markdown. No explanation outside the JSON.\n\nJOB:\n${jobSummary}\n\nCANDIDATES (array of Umurava talent profiles):\n${JSON.stringify(candidatesPayload)}\n\nEach candidate has these fields:\nfirstName, lastName, headline,\nskills[]{name,level,yearsOfExperience},\nexperience[]{company,role,startDate,endDate,technologies,isCurrent},\neducation[]{institution,degree,fieldOfStudy},\nprojects[]{name,technologies,role}, availability{status,type}\n\nScoring weights: Skills 40%, Experience 30%, Education 15%, Completeness 15%.\n\nFor skills, use level values: Expert=1.0x, Advanced=0.85x, Intermediate=0.65x, Beginner=0.4x.\n\nReturn JSON: { results: [ {\n  applicantId, overallScore, skillsScore, experienceScore,\n  educationScore, relevanceScore,\n  strengths (array of strings), gaps (array of strings),\n  recommendation (string, 50-150 words)\n} ] }\n\nSort by overallScore descending. Evaluate ALL candidates.`;
}

function toScreeningResults(
  job: JobForScreening,
  applicants: ApplicantForScreening[],
  payload: GeminiResultPayload,
): ScreeningResult[] {
  const shortlistSize = job.shortlistSize || 10;
  const applicantLookup = new Map(applicants.map((applicant) => [applicant._id, applicant]));

  const ranked = [...payload.results].sort((a, b) => b.overallScore - a.overallScore);

  return ranked.map((item, index) => {
    const applicant = applicantLookup.get(item.applicantId);
    const applicantName = applicant ? `${applicant.firstName} ${applicant.lastName}`.trim() : item.applicantId;
    const insights = applicant ? deriveApplicantInsights(job, applicant) : [];

    return {
      rank: index + 1,
      applicantId: item.applicantId,
      applicantName: applicantName || item.applicantId,
      overallScore: Math.round(item.overallScore),
      skillsScore: Math.round(item.skillsScore),
      experienceScore: Math.round(item.experienceScore),
      educationScore: Math.round(item.educationScore),
      relevanceScore: Math.round(item.relevanceScore),
      strengths: item.strengths.slice(0, 4),
      gaps: item.gaps.slice(0, 4),
      recommendation: item.recommendation.trim(),
      isShortlisted: index < shortlistSize,
      insights,
    } satisfies ScreeningResult;
  });
}

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 600;
const RETRYABLE_STATUS_CODES = new Set([429, 503]);
const MODEL_FALLBACK_CHAIN = [
  getGeminiModelName(),
  "gemini-3-flash-preview",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

function dedupeModels(modelNames: string[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const name of modelNames) {
    if (!name) continue;
    const normalised = name.trim();
    if (normalised.length === 0 || seen.has(normalised)) continue;
    seen.add(normalised);
    ordered.push(normalised);
  }
  return ordered;
}

function getErrorStatus(error: unknown): number | null {
  if (error && typeof error === "object") {
    const status = (error as { status?: number }).status;
    if (typeof status === "number") {
      return status;
    }
    const code = (error as { code?: number | string }).code;
    if (typeof code === "number") {
      return code;
    }
    if (typeof code === "string") {
      const numeric = Number.parseInt(code, 10);
      if (!Number.isNaN(numeric)) {
        return numeric;
      }
    }
    const message = (error as Error)?.message;
    if (typeof message === "string") {
      if (message.includes("429")) return 429;
      if (message.includes("503")) return 503;
    }
  }
  return null;
}

async function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function callGeminiWithFallback(prompt: string) {
  const models = dedupeModels(MODEL_FALLBACK_CHAIN);
  let lastError: unknown = null;

  for (const modelName of models) {
    const model = getGeminiModelByName(modelName);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      try {
        const result = await model.generateContent(prompt);
        const rawText = result.response.text();
        return { rawText, modelName };
      } catch (error) {
        lastError = error;
        const status = getErrorStatus(error);
        const isRetryable = status !== null && RETRYABLE_STATUS_CODES.has(status);
        const isLastAttempt = attempt === MAX_RETRIES - 1;

        if (!isRetryable || isLastAttempt) {
          break;
        }

        const delay = BASE_RETRY_DELAY_MS * 2 ** attempt;
        await wait(delay);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini models are unavailable");
}

async function runGeminiScreening(job: JobForScreening, applicants: ApplicantForScreening[]) {
  const prompt = buildPrompt(job, applicants);
  const startedAt = performance.now();

  const { rawText, modelName } = await callGeminiWithFallback(prompt);
  if (!rawText || rawText.trim().length === 0) {
    throw new Error("Gemini API returned an empty response");
  }

  const sanitized = rawText.replace(/```json|```/gi, "").trim();

  let payload: unknown;
  try {
    payload = JSON.parse(sanitized);
  } catch (error) {
    throw new Error("Gemini returned a non-JSON response");
  }

  const parsed = parseScreeningResponsePayload(payload);
  const processingTimeMs = Math.round(performance.now() - startedAt);
  const results = toScreeningResults(job, applicants, parsed);

  return {
    results,
    processingTimeMs,
    aiModelVersion: modelName,
    promptVersion: PROMPT_VERSION,
  } satisfies Omit<ScreeningExecutionResult, "usedFallback" | "errorMessage">;
}

export async function executeScreening(job: JobForScreening, applicants: ApplicantForScreening[]): Promise<ScreeningExecutionResult> {
  if (!isGeminiConfigured()) {
    const fallback = computeScreeningResults(job, applicants);
    return {
      results: fallback.results,
      processingTimeMs: fallback.processingTimeMs,
      aiModelVersion: "heuristic-v1",
      promptVersion: "manual-heuristic",
      usedFallback: true,
      errorMessage: "Gemini API key is not configured.",
    };
  }

  try {
    const aiResult = await runGeminiScreening(job, applicants);
    return {
      ...aiResult,
      usedFallback: false,
    };
  } catch (error) {
    if (error instanceof ScreeningSystemLimitError) {
      throw error;
    }
    const fallback = computeScreeningResults(job, applicants);
    const message = error instanceof Error ? error.message : "Unknown Gemini error";

    return {
      results: fallback.results,
      processingTimeMs: fallback.processingTimeMs,
      aiModelVersion: "heuristic-v1",
      promptVersion: "manual-heuristic",
      usedFallback: true,
      errorMessage: message,
    };
  }
}
