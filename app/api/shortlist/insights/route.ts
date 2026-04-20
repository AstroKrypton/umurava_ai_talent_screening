import { NextResponse } from "next/server";
import { getGeminiModelByName, getGeminiModelName, isGeminiConfigured } from "@/src/lib/geminiClient";
import type { InclusionInsightsReport } from "@/src/types/insights";

const MODEL_NAME = "gemini-3-flash";
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 450;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);
const MODEL_FALLBACK_CHAIN = dedupeModels([
  MODEL_NAME,
  getGeminiModelName(),
  "gemini-3-flash-preview",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro-latest",
  "gemini-1.5-pro",
]);

function clampPercentage(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dedupeModels(modelNames: string[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const name of modelNames) {
    if (!name) continue;
    const trimmed = name.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    ordered.push(trimmed);
  }
  return ordered;
}

function getErrorStatus(error: unknown): number | null {
  if (error && typeof error === "object") {
    const status = (error as { status?: number }).status;
    if (typeof status === "number") return status;

    const code = (error as { code?: number | string }).code;
    if (typeof code === "number") return code;
    if (typeof code === "string") {
      const parsed = Number.parseInt(code, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }

    const message = (error as Error).message;
    if (typeof message === "string") {
      if (message.includes("429")) return 429;
      if (message.includes("503")) return 503;
      if (message.includes("500")) return 500;
    }
  }
  return null;
}

async function wait(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractJsonBlock(raw: string) {
  const trimmed = raw.replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      return JSON.parse(candidate);
    }
    throw new Error("Gemini returned a non-JSON response");
  }
}

async function callGeminiWithFallback(prompt: string) {
  let lastError: unknown = null;

  for (const modelName of MODEL_FALLBACK_CHAIN) {
    const model = getGeminiModelByName(modelName);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      try {
        const result = await model.generateContent(prompt);
        const rawText = result.response?.text();
        if (!rawText || rawText.trim().length === 0) {
          throw new Error("Gemini API returned an empty response");
        }
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

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const body = payload as Partial<{
    shortlistId: string;
    shortlist: unknown;
    jobId?: string;
  }>;

  if (!body.shortlistId || typeof body.shortlistId !== "string") {
    return NextResponse.json({ error: "shortlistId is required." }, { status: 400 });
  }

  if (!Array.isArray(body.shortlist) || body.shortlist.length === 0) {
    return NextResponse.json({ error: "shortlist must be a non-empty array." }, { status: 400 });
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json({ error: "Inclusion insights are unavailable: Gemini is not configured." }, { status: 503 });
  }

  const shortlistJson = JSON.stringify(body.shortlist, null, 2);
  const prompt = `Analyze the following candidate shortlist. Evaluate the "Diversity of Experience" and "Educational Backgrounds". Provide an "Inclusion Score" (0-100) and a brief justification (max 50 words) confirming that the ranking is based on technical merit and project evidence, ensuring no bias toward specific institutions or labels.\n\nReturn JSON with the following shape:\n{\n  "inclusionScore": number,\n  "skillDiversityIndex": number,\n  "educationNeutrality": string,\n  "inclusionSummary": string,\n  "justification": string\n}\n\nSHORTLIST: ${shortlistJson}`;

  try {
    const { rawText, modelName } = await callGeminiWithFallback(prompt);
    const parsed = extractJsonBlock(rawText) as Partial<Record<string, unknown>>;

    const report: InclusionInsightsReport = {
      inclusionScore: clampPercentage(parsed.inclusionScore, 50),
      skillDiversityIndex: clampPercentage(parsed.skillDiversityIndex, 50),
      educationNeutrality: typeof parsed.educationNeutrality === "string" ? parsed.educationNeutrality : "Balanced",
      inclusionSummary:
        typeof parsed.inclusionSummary === "string"
          ? parsed.inclusionSummary.slice(0, 320)
          : "The shortlist reflects a range of project experiences and balanced learning paths rooted in hands-on merit.",
      justification: typeof parsed.justification === "string" ? parsed.justification.slice(0, 200) : undefined,
      source: "gemini",
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error("Failed to compute inclusion insights", error);
    return NextResponse.json({ error: "Unable to generate inclusion insights at this time." }, { status: 500 });
  }
}
