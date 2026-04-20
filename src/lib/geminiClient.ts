import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const FALLBACK_KEYS = ["GEMINI_API_KEY", "GEMINI_AI_API_KEY"] as const;

let cachedClient: GoogleGenerativeAI | null = null;

function getGeminiApiKey() {
  for (const key of FALLBACK_KEYS) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export function isGeminiConfigured() {
  return Boolean(getGeminiApiKey());
}

export function getGeminiModelName() {
  return MODEL_NAME;
}

export function getGeminiModel() {
  return getGeminiModelByName(MODEL_NAME);
}

export function getGeminiModelByName(modelName: string) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Set GEMINI_API_KEY or GEMINI_AI_API_KEY.");
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(apiKey);
  }

  return cachedClient.getGenerativeModel({ model: modelName });
}
