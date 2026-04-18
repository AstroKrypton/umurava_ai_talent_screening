import { z } from "zod";
import { getGeminiModel, getGeminiModelName, isGeminiConfigured } from "@/src/lib/geminiClient";
import type { ParsedApplicant } from "@/src/services/applicantImportService";
import type { AvailabilityType, AvailabilityStatus, LanguageProficiency, SkillLevel } from "@/src/types/talent";

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return undefined;
  },
  z.string().optional(),
);

const nonEmptyString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1),
);

const coercePositiveNumber = (fallback = 0) =>
  z.preprocess((value) => {
    if (value == null || value === "") return fallback;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }, z.number().min(0));

const coerceOptionalNumber = () =>
  z.preprocess((value) => {
    if (value == null || value === "") return undefined;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }, z.number().optional());

const skillSchema = z.object({
  name: nonEmptyString,
  level: z.preprocess(
    (value) => (typeof value === "string" && (SKILL_LEVELS as readonly string[]).includes(value) ? value : "Intermediate"),
    z.enum(SKILL_LEVELS),
  ),
  yearsOfExperience: coercePositiveNumber(),
});

const experienceSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  description: z.string().default(""),
  technologies: z.array(z.string()).default([]),
  isCurrent: z.boolean().default(false),
});

const educationSchema = z.object({
  institution: nonEmptyString,
  degree: z.preprocess((value) => (typeof value === "string" ? value.trim() : ""), z.string().default("")),
  fieldOfStudy: z.preprocess((value) => (typeof value === "string" ? value.trim() : ""), z.string().default("")),
  startYear: coercePositiveNumber(),
  endYear: coerceOptionalNumber(),
});

const projectSchema = z.object({
  name: nonEmptyString,
  description: z.preprocess((value) => (typeof value === "string" ? value.trim() : ""), z.string().default("")),
  technologies: z
    .array(z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string()))
    .default([]),
  role: z.preprocess((value) => (typeof value === "string" ? value.trim() : ""), z.string().default("")),
  link: optionalTrimmedString,
  startDate: z.preprocess((value) => (typeof value === "string" ? value.trim() : ""), z.string().default("")),
  endDate: optionalTrimmedString,
});

const languageSchema = z.object({
  name: nonEmptyString,
  proficiency: z.preprocess((value) => (typeof value === "string" ? value.trim() : "Conversational"), z.string().default("Conversational")),
});

const certificationSchema = z.object({
  name: nonEmptyString,
  issuer: z.preprocess((value) => (typeof value === "string" ? value.trim() : ""), z.string().default("")),
  issueDate: z.preprocess((value) => (typeof value === "string" ? value.trim() : ""), z.string().default("")),
});

const availabilitySchema = z
  .object({
    status: z.preprocess(
      (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : "Open to Opportunities"),
      z.string(),
    ),
    type: z.preprocess(
      (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : "Full-time"),
      z.string(),
    ),
    startDate: optionalTrimmedString,
  })
  .default({ status: "Open to Opportunities", type: "Full-time" });

const socialLinksSchema = z
  .object({
    linkedin: optionalTrimmedString,
    github: optionalTrimmedString,
    portfolio: optionalTrimmedString,
  })
  .partial()
  .optional();

export const resumeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  headline: nonEmptyString,
  bio: optionalTrimmedString,
  location: nonEmptyString,
  skills: z.array(skillSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  projects: z.array(projectSchema).default([]),
  availability: availabilitySchema,
  languages: z.array(languageSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  socialLinks: socialLinksSchema,
  resumeUrl: optionalTrimmedString,
  rawResumeText: optionalTrimmedString,
});

const PROMPT_TEXT = `Parse this resume and return a JSON object matching the Umurava Talent Profile Schema.
Use these exact field names:
firstName, lastName, email, headline, bio, location,
skills[]{name, level, yearsOfExperience},
languages[]{name, proficiency},
experience[]{company, role, startDate, endDate, description, technologies, isCurrent},
education[]{institution, degree, fieldOfStudy, startYear, endYear},
certifications[]{name, issuer, issueDate},
projects[]{name, description, technologies, role, link, startDate, endDate},
availability{status, type, startDate},
socialLinks{linkedin, github, portfolio},
resumeUrl, rawResumeText.

Return ONLY valid JSON. No markdown.`;

export interface ParsePdfResult {
  applicant: ParsedApplicant;
  rawResponse: string;
  aiModelVersion: string;
}

export async function parseResumePdf(buffer: Buffer): Promise<ParsePdfResult> {
  if (!isGeminiConfigured()) {
    throw new Error("Gemini API key is not configured. PDF parsing is unavailable.");
  }

  const model = getGeminiModel();
  const base64 = buffer.toString("base64");

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT_TEXT },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const responseText = result.response.text();
  if (!responseText || responseText.trim().length === 0) {
    throw new Error("Gemini returned an empty response for the resume.");
  }

  const sanitized = responseText.replace(/```json|```/gi, "").trim();

  let jsonPayload: unknown;
  try {
    jsonPayload = JSON.parse(sanitized);
  } catch (error) {
    throw new Error("Gemini returned a non-JSON response for the resume.");
  }

  const parsed = resumeSchema.parse(jsonPayload);

  const applicant: ParsedApplicant = {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    email: parsed.email.toLowerCase(),
    headline: parsed.headline,
    bio: parsed.bio,
    location: parsed.location,
    skills: parsed.skills.map((skill) => ({
      name: skill.name,
      level: (skill.level as SkillLevel) ?? "Intermediate",
      yearsOfExperience: skill.yearsOfExperience ?? 0,
    })),
    experience: parsed.experience,
    education: parsed.education,
    projects: parsed.projects,
    availability: {
      status: (parsed.availability.status as AvailabilityStatus) ?? "Open to Opportunities",
      type: (parsed.availability.type as AvailabilityType) ?? "Full-time",
      startDate: parsed.availability.startDate,
    },
    languages: parsed.languages.map((language) => ({
      name: language.name,
      proficiency: (language.proficiency as LanguageProficiency) ?? "Conversational",
    })),
    certifications: parsed.certifications,
    socialLinks: parsed.socialLinks,
    resumeUrl: parsed.resumeUrl,
    rawResumeText: parsed.rawResumeText,
    umuravaProfileId: undefined,
    source: "external",
  };

  return {
    applicant,
    rawResponse: sanitized,
    aiModelVersion: getGeminiModelName(),
  };
}
