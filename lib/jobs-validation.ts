import { z } from "zod";
import { JOB_STATUS_VALUES } from "@/lib/jobs-service";

type SkillInput = string | string[];

function normalizeSkillArray(value?: SkillInput | null, { preserveUndefined = false } = {}) {
  if (value === undefined) {
    return preserveUndefined ? undefined : [];
  }

  if (value === null) {
    return [];
  }

  const entries = Array.isArray(value) ? value : value.split(",");
  const skills = entries
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 40);

  return preserveUndefined ? (skills as string[] | undefined) : skills;
}

const baseSkillInputSchema = z.union([z.string(), z.array(z.string())]);

export const jobQuerySchema = z
  .object({
    status: z.enum(JOB_STATUS_VALUES).optional(),
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

export const jobCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1),
    location: z.string().trim().min(1).max(120),
    requiredSkills: baseSkillInputSchema.optional().transform((value) => normalizeSkillArray(value)),
    niceToHaveSkills: baseSkillInputSchema.optional().transform((value) => normalizeSkillArray(value)),
    minExperienceYears: z.coerce.number().min(0).max(50).default(0),
    educationLevel: z.enum(["any", "bachelor", "master", "phd"]).default("any"),
    employmentType: z.enum(["full-time", "part-time", "contract"]).default("full-time"),
    shortlistSize: z.union([z.literal(10), z.literal(20)]).default(10),
    status: z.enum(JOB_STATUS_VALUES).default("draft"),
    source: z.enum(["umurava", "external"]).default("umurava"),
  })
  .strict();

export const jobUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().min(1).optional(),
    location: z.string().trim().min(1).max(120).optional(),
    requiredSkills: baseSkillInputSchema.optional().transform((value) => normalizeSkillArray(value, { preserveUndefined: true })),
    niceToHaveSkills: baseSkillInputSchema.optional().transform((value) => normalizeSkillArray(value, { preserveUndefined: true })),
    minExperienceYears: z.coerce.number().min(0).max(50).optional(),
    educationLevel: z.enum(["any", "bachelor", "master", "phd"]).optional(),
    employmentType: z.enum(["full-time", "part-time", "contract"]).optional(),
    shortlistSize: z.union([z.literal(10), z.literal(20)]).optional(),
    status: z.enum(JOB_STATUS_VALUES).optional(),
    source: z.enum(["umurava", "external"]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export type JobCreateInput = z.infer<typeof jobCreateSchema>;
export type JobUpdateInput = z.infer<typeof jobUpdateSchema>;
export type JobQueryInput = z.infer<typeof jobQuerySchema>;
