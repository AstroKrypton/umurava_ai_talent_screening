import { connectToDatabase } from "@/lib/mongodb";
import { JobModel } from "@/models/Job";

export const JOB_STATUS_VALUES = ["draft", "open", "screening", "closed"] as const;
export type JobStatus = (typeof JOB_STATUS_VALUES)[number];

export type StatusCounts = {
  all: number;
  draft: number;
  open: number;
  screening: number;
  closed: number;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type SerializedJob = {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  minExperienceYears: number;
  educationLevel: string;
  location: string;
  employmentType: "full-time" | "part-time" | "contract";
  shortlistSize: number;
  status: JobStatus;
  source: "umurava" | "external";
  createdAt: string | null;
  updatedAt: string | null;
};

export type JobsListingParams = {
  createdBy: string;
  status?: JobStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export type JobsListingResult = {
  jobs: SerializedJob[];
  counts: StatusCounts;
  pagination: PaginationMeta;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function serializeJob(job: any): SerializedJob {
  return {
    id: String(job._id),
    title: job.title,
    description: job.description,
    requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills : [],
    niceToHaveSkills: Array.isArray(job.niceToHaveSkills) ? job.niceToHaveSkills : [],
    minExperienceYears: typeof job.minExperienceYears === "number" ? job.minExperienceYears : 0,
    educationLevel: job.educationLevel ?? "any",
    location: job.location,
    employmentType: job.employmentType,
    shortlistSize: typeof job.shortlistSize === "number" ? job.shortlistSize : 10,
    status: job.status,
    source: job.source,
    createdAt: toIsoString(job.createdAt),
    updatedAt: toIsoString(job.updatedAt),
  };
}

function createEmptyCounts(): StatusCounts {
  return {
    all: 0,
    draft: 0,
    open: 0,
    screening: 0,
    closed: 0,
  };
}

export function isJobStatus(value: unknown): value is JobStatus {
  return typeof value === "string" && (JOB_STATUS_VALUES as readonly string[]).includes(value);
}

export async function fetchJobsListing(params: JobsListingParams): Promise<JobsListingResult> {
  const { createdBy, status, search, page, limit } = params;

  await connectToDatabase();

  const trimmedSearch = search?.trim() ?? "";
  const pageSize = Math.min(Math.max(limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const currentPage = Math.max(page ?? 1, 1);
  const skip = (currentPage - 1) * pageSize;

  const baseMatch: Record<string, unknown> = { createdBy };

  if (trimmedSearch) {
    baseMatch.title = { $regex: escapeRegExp(trimmedSearch), $options: "i" };
  }

  const matchWithStatus = status ? { ...baseMatch, status } : { ...baseMatch };

  const [jobsDocs, total, countsAgg] = await Promise.all([
    JobModel.find(matchWithStatus).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    JobModel.countDocuments(matchWithStatus),
    JobModel.aggregate<{ _id: JobStatus; count: number }>([
      { $match: baseMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const counts = createEmptyCounts();
  countsAgg.forEach((entry) => {
    if (isJobStatus(entry._id)) {
      counts[entry._id] = entry.count;
    }
  });

  counts.all = counts.draft + counts.open + counts.screening + counts.closed;

  const pagination: PaginationMeta = {
    page: currentPage,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };

  return {
    jobs: jobsDocs.map(serializeJob),
    counts,
    pagination,
  };
}
