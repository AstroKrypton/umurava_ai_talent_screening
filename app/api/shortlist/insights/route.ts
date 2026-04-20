import { NextResponse } from "next/server";
import { getGeminiModelByName, isGeminiConfigured } from "@/src/lib/geminiClient";
import type { InclusionInsightsReport } from "@/src/types/insights";

const MODEL_NAME = "gemini-3-flash";

function clampPercentage(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
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
    const model = getGeminiModelByName(MODEL_NAME);
    const result = await model.generateContent(prompt);
    const text = result.response?.text();

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    const sanitized = text.replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(sanitized) as Partial<{ [key: string]: unknown }>;

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
