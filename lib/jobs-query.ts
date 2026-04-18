import type { JobStatus } from "@/lib/jobs-service";

export type JobsQueryParams = {
  status?: JobStatus | "all";
  search?: string;
  page?: number;
  pageSize?: number;
};

export function buildJobsQuery(params: JobsQueryParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.status && params.status !== "all") {
    searchParams.set("status", params.status);
  }

  if (params.search && params.search.trim().length > 0) {
    searchParams.set("search", params.search.trim());
  }

  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }

  if (params.pageSize && params.pageSize > 0) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  return searchParams;
}

export function buildJobsEndpoint(params: JobsQueryParams = {}) {
  const query = buildJobsQuery(params).toString();
  return query ? `/api/jobs?${query}` : "/api/jobs";
}
