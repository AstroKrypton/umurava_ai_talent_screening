import { parse } from "csv-parse/sync";
import type {
  TalentProfile,
  Skill,
  Experience,
  Education,
  Project,
  Availability,
  Language,
  Certification,
  SocialLinks,
} from "@/src/types/talent";

const REQUIRED_FIELDS = ["firstName", "lastName", "email"] as const;

export type CsvFieldMapping = Partial<
  Record<
    | "firstName"
    | "lastName"
    | "email"
    | "headline"
    | "bio"
    | "location"
    | "skills"
    | "experience"
    | "education"
    | "projects"
    | "languages"
    | "certifications"
    | "availability"
    | "socialLinks"
    | "umuravaProfileId"
    | "resumeUrl"
    | "rawResumeText"
    | "source"
  , string>
>;

export interface CsvImportOptions {
  mapping?: CsvFieldMapping;
  defaultSource: TalentProfile["source"];
}

export interface CsvImportWarning {
  row: number;
  message: string;
}

export interface CsvImportParseResult {
  applicants: ParsedApplicant[];
  warnings: CsvImportWarning[];
}

export type ParsedApplicant = Pick<
  TalentProfile,
  | "firstName"
  | "lastName"
  | "email"
  | "headline"
  | "bio"
  | "location"
  | "skills"
  | "experience"
  | "education"
  | "projects"
  | "availability"
  | "languages"
  | "certifications"
  | "socialLinks"
  | "resumeUrl"
  | "rawResumeText"
  | "umuravaProfileId"
> & {
  source: TalentProfile["source"];
};

function getValue(row: Record<string, unknown>, key: string | undefined) {
  if (!key) return undefined;
  const value = row[key];
  return value ?? row[key.trim()];
}

function parseJson<T>(value: unknown): T | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string") return value as T;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return undefined;
  }
}

const AVAILABILITY_STATUS_MAP: Record<string, Availability["status"]> = {
  available: "Available",
  "open to opportunities": "Open to Opportunities",
  "not available": "Not Available",
};

const AVAILABILITY_TYPE_MAP: Record<string, Availability["type"]> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
};

const LANGUAGE_PROFICIENCY_MAP: Record<string, Language["proficiency"]> = {
  basic: "Basic",
  conversational: "Conversational",
  fluent: "Fluent",
  native: "Native",
};

function normaliseSkillLevel(level?: string): Skill["level"] {
  if (!level) return "Intermediate";
  const normalised = level.trim().toLowerCase();
  switch (normalised) {
    case "beginner":
      return "Beginner";
    case "intermediate":
      return "Intermediate";
    case "advanced":
      return "Advanced";
    case "expert":
      return "Expert";
    default:
      return "Intermediate";
  }
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalised = value.trim().toLowerCase();
  return ["true", "1", "yes", "y", "current"].includes(normalised);
}

function normaliseAvailabilityStatus(status?: string): Availability["status"] {
  if (!status) return "Open to Opportunities";
  const key = status.trim().toLowerCase();
  return AVAILABILITY_STATUS_MAP[key] ?? "Open to Opportunities";
}

function normaliseAvailabilityType(type?: string): Availability["type"] {
  if (!type) return "Full-time";
  const key = type.trim().toLowerCase();
  return AVAILABILITY_TYPE_MAP[key] ?? "Full-time";
}

function normaliseLanguageProficiency(value?: string): Language["proficiency"] {
  if (!value) return "Conversational";
  const key = value.trim().toLowerCase();
  return LANGUAGE_PROFICIENCY_MAP[key] ?? "Conversational";
}

function parseDelimitedSkills(raw: string): Skill[] {
  return raw
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, level, years] = entry.split(":");
      return {
        name: (name ?? "").trim(),
        level: normaliseSkillLevel(level),
        yearsOfExperience: toNumber(years)?.valueOf() ?? 0,
      } satisfies Skill;
    })
    .filter((item) => item.name.length > 0);
}

function parseDelimitedExperience(raw: string): Experience[] {
  return raw
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(":");
      const [companyRaw, roleRaw, startDateRaw, endDateRaw, ...rest] = parts;
      const technologiesRaw = rest.length >= 2 ? rest[rest.length - 2] : "";
      const isCurrentRaw = rest.length >= 1 ? rest[rest.length - 1] : "";
      const descriptionRaw = rest.slice(0, Math.max(0, rest.length - 2)).join(":");

      const technologies = technologiesRaw
        .split(",")
        .map((tech) => tech.trim())
        .filter(Boolean);

      return {
        company: (companyRaw ?? "").trim(),
        role: (roleRaw ?? "").trim(),
        startDate: (startDateRaw ?? "").trim(),
        endDate: (endDateRaw ?? "").trim(),
        description: descriptionRaw.trim(),
        technologies,
        isCurrent: toBoolean(isCurrentRaw) || (endDateRaw ?? "").trim().toLowerCase() === "present",
      } satisfies Experience;
    })
    .filter((item) => item.company.length > 0 && item.role.length > 0);
}

function parseDelimitedEducation(raw: string): Education[] {
  return raw
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(":");
      const [institutionRaw, degreeRaw, fieldRaw, startYearRaw, endYearRaw] = [
        parts[0],
        parts[1],
        parts[2],
        parts[3],
        parts.slice(4).join(":") || undefined,
      ];

      const startYear = toNumber(startYearRaw);
      const endYear = toNumber(endYearRaw);

      return {
        institution: (institutionRaw ?? "").trim(),
        degree: (degreeRaw ?? "").trim(),
        fieldOfStudy: (fieldRaw ?? "").trim(),
        startYear: startYear ?? 0,
        endYear: endYear,
      } satisfies Education;
    })
    .filter((item) => item.institution.length > 0);
}

function parseDelimitedAvailability(raw: string): Availability | undefined {
  const [statusRaw, typeRaw, startDateRaw] = raw.split(":");
  const status = normaliseAvailabilityStatus(statusRaw);
  const type = normaliseAvailabilityType(typeRaw);
  if (!status || !type) {
    return undefined;
  }
  return {
    status,
    type,
    startDate: startDateRaw?.trim() || undefined,
  } satisfies Availability;
}

function parseDelimitedLanguages(raw: string): Language[] {
  return raw
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [nameRaw, proficiencyRaw] = entry.split(":");
      return {
        name: (nameRaw ?? "").trim(),
        proficiency: normaliseLanguageProficiency(proficiencyRaw),
      } satisfies Language;
    })
    .filter((item) => item.name.length > 0);
}

function parseSkills(value: unknown): Skill[] {
  const parsed = parseJson<Skill[]>(value);
  if (Array.isArray(parsed)) {
    return parsed
      .filter((item) => item && typeof item.name === "string")
      .map((item) => ({
        name: item.name.trim(),
        level: item.level ?? "Intermediate",
        yearsOfExperience: Number.isFinite(item.yearsOfExperience) ? Number(item.yearsOfExperience) : 0,
      }));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.includes("|") || trimmed.includes(":")) {
      return parseDelimitedSkills(trimmed);
    }
    return trimmed
      .split(/[,;\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((name) => ({ name, level: "Intermediate", yearsOfExperience: 0 } satisfies Skill));
  }

  return [];
}

function parseExperience(value: unknown): Experience[] {
  const parsed = parseJson<Experience[]>(value);
  if (Array.isArray(parsed)) {
    return parsed
      .filter((item) => item && typeof item.company === "string" && typeof item.role === "string")
      .map((item) => ({
        company: item.company.trim(),
        role: item.role.trim(),
        startDate: item.startDate ?? "",
        endDate: item.endDate ?? "",
        description: item.description ?? "",
        technologies: Array.isArray(item.technologies) ? item.technologies : [],
        isCurrent: Boolean(item.isCurrent),
      }));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return parseDelimitedExperience(trimmed);
  }

  return [];
}

function parseEducation(value: unknown): Education[] {
  const parsed = parseJson<Education[]>(value);
  if (Array.isArray(parsed)) {
    return parsed
      .filter((item) => item && typeof item.institution === "string")
      .map((item) => ({
        institution: item.institution.trim(),
        degree: item.degree ?? "",
        fieldOfStudy: item.fieldOfStudy ?? "",
        startYear: typeof item.startYear === "number" ? item.startYear : 0,
        endYear: typeof item.endYear === "number" ? item.endYear : undefined,
      }));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return parseDelimitedEducation(trimmed);
  }
  return [];
}

function parseProjects(value: unknown): Project[] {
  const parsed = parseJson<Project[]>(value);
  if (Array.isArray(parsed)) {
    return parsed
      .filter((item) => item && typeof item.name === "string")
      .map((item) => ({
        name: item.name.trim(),
        description: item.description ?? "",
        technologies: Array.isArray(item.technologies) ? item.technologies : [],
        role: item.role ?? "",
        link: item.link,
        startDate: item.startDate ?? "",
        endDate: item.endDate ?? undefined,
      }));
  }
  return [];
}

function parseLanguages(value: unknown): Language[] {
  const parsed = parseJson<Language[]>(value);
  if (Array.isArray(parsed)) {
    return parsed
      .filter((item) => item && typeof item.name === "string")
      .map((item) => ({
        name: item.name.trim(),
        proficiency: normaliseLanguageProficiency(item.proficiency),
      }));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return parseDelimitedLanguages(trimmed);
  }
  return [];
}

function parseCertifications(value: unknown): Certification[] {
  const parsed = parseJson<Certification[]>(value);
  if (Array.isArray(parsed)) {
    return parsed
      .filter((item) => item && typeof item.name === "string")
      .map((item) => ({
        name: item.name.trim(),
        issuer: item.issuer ?? "",
        issueDate: item.issueDate ?? "",
      }));
  }
  return [];
}

function parseAvailability(value: unknown): Availability | undefined {
  const parsed = parseJson<Availability>(value);
  if (parsed && parsed.status && parsed.type) {
    return parsed;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return parseDelimitedAvailability(trimmed);
  }
  return undefined;
}

function parseSocialLinks(value: unknown): SocialLinks | undefined {
  const parsed = parseJson<SocialLinks>(value);
  if (!parsed) return undefined;
  return {
    linkedin: parsed.linkedin,
    github: parsed.github,
    portfolio: parsed.portfolio,
  };
}

function resolveField(row: Record<string, unknown>, field: string, mapping?: CsvFieldMapping) {
  const column = mapping?.[field as keyof CsvFieldMapping] ?? field;
  return getValue(row, column);
}

function normaliseRow(
  row: Record<string, unknown>,
  index: number,
  options: CsvImportOptions,
): { applicant?: ParsedApplicant; warnings: CsvImportWarning[] } {
  const warnings: CsvImportWarning[] = [];
  const values: Record<string, unknown> = {};

  for (const field of REQUIRED_FIELDS) {
    const rawValue = resolveField(row, field, options.mapping);
    if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
      warnings.push({ row: index, message: `Missing required field '${field}'.` });
      return { warnings };
    }
    values[field] = rawValue.trim();
  }

  let availability = parseAvailability(resolveField(row, "availability", options.mapping));
  if (!availability) {
    warnings.push({ row: index, message: "Availability missing or invalid. Using default availability (Available Now)." });
    availability = {
      status: "Available",
      type: "Full-time",
    } satisfies Availability;
  }

  const headlineRaw = resolveField(row, "headline", options.mapping);
  const locationRaw = resolveField(row, "location", options.mapping);
  if (typeof headlineRaw !== "string" || headlineRaw.trim().length === 0) {
    warnings.push({ row: index, message: "Missing headline. Using fallback headline." });
  }
  if (typeof locationRaw !== "string" || locationRaw.trim().length === 0) {
    warnings.push({ row: index, message: "Missing location. Using fallback location." });
  }

  const applicant: ParsedApplicant = {
    firstName: values.firstName as string,
    lastName: values.lastName as string,
    email: (values.email as string).toLowerCase(),
    headline:
      typeof headlineRaw === "string" && headlineRaw.trim().length > 0
        ? headlineRaw.trim()
        : `${values.firstName as string} ${values.lastName as string}`,
    location: typeof locationRaw === "string" && locationRaw.trim().length > 0 ? locationRaw.trim() : "Unknown",
    bio:
      typeof resolveField(row, "bio", options.mapping) === "string"
        ? (resolveField(row, "bio", options.mapping) as string).trim()
        : undefined,
    skills: parseSkills(resolveField(row, "skills", options.mapping)),
    experience: parseExperience(resolveField(row, "experience", options.mapping)),
    education: parseEducation(resolveField(row, "education", options.mapping)),
    projects: parseProjects(resolveField(row, "projects", options.mapping)),
    availability,
    languages: parseLanguages(resolveField(row, "languages", options.mapping)),
    certifications: parseCertifications(resolveField(row, "certifications", options.mapping)),
    socialLinks: parseSocialLinks(resolveField(row, "socialLinks", options.mapping)),
    resumeUrl:
      typeof resolveField(row, "resumeUrl", options.mapping) === "string"
        ? (resolveField(row, "resumeUrl", options.mapping) as string).trim()
        : undefined,
    rawResumeText:
      typeof resolveField(row, "rawResumeText", options.mapping) === "string"
        ? (resolveField(row, "rawResumeText", options.mapping) as string)
        : undefined,
    source:
      (resolveField(row, "source", options.mapping) as TalentProfile["source"]) ?? options.defaultSource,
    umuravaProfileId:
      typeof resolveField(row, "umuravaProfileId", options.mapping) === "string"
        ? (resolveField(row, "umuravaProfileId", options.mapping) as string).trim()
        : undefined,
  };

  if (applicant.skills.length === 0) {
    warnings.push({ row: index, message: "At least one skill is required." });
  }

  if (applicant.experience.length === 0) {
    warnings.push({ row: index, message: "At least one experience entry is required." });
  }

  if (applicant.education.length === 0) {
    warnings.push({ row: index, message: "At least one education entry is required." });
  }

  if (applicant.projects.length === 0) {
    warnings.push({ row: index, message: "At least one project entry is required." });
  }

  return { applicant, warnings };
}

export function parseApplicantsCsv(csv: string | Buffer, options: CsvImportOptions): CsvImportParseResult {
  const text = Buffer.isBuffer(csv) ? csv.toString("utf-8") : csv;

  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];

  const applicants: ParsedApplicant[] = [];
  const warnings: CsvImportWarning[] = [];

  rows.forEach((row, index) => {
    const result = normaliseRow(row, index + 2, options);
    warnings.push(...result.warnings);
    if (result.applicant) {
      applicants.push(result.applicant);
    }
  });

  const availabilityNotice = "Availability missing or invalid. Using default availability (Available Now).";
  const availabilityWarnings = warnings.filter((warning) => warning.message === availabilityNotice);
  const reducedWarnings = warnings.filter((warning) => warning.message !== availabilityNotice);

  if (availabilityWarnings.length > 0) {
    reducedWarnings.push({
      row: 0,
      message: `Notice: ${availabilityWarnings.length} rows were missing availability; used default (Available Now).`,
    });
  }

  return { applicants, warnings: reducedWarnings };
}

export function buildApplicantDocuments(jobId: string, applicants: ParsedApplicant[]) {
  return applicants.map((applicant) => ({
    jobId,
    source: applicant.source,
    umuravaProfileId: applicant.umuravaProfileId,
    firstName: applicant.firstName,
    lastName: applicant.lastName,
    email: applicant.email,
    headline: applicant.headline,
    bio: applicant.bio,
    location: applicant.location,
    skills: applicant.skills,
    languages: applicant.languages ?? [],
    experience: applicant.experience,
    education: applicant.education,
    certifications: applicant.certifications ?? [],
    projects: applicant.projects,
    availability: applicant.availability,
    socialLinks: applicant.socialLinks,
    resumeUrl: applicant.resumeUrl,
    rawResumeText: applicant.rawResumeText,
  }));
}
