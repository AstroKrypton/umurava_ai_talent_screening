"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { JobStatus, PaginationMeta, SerializedJob, StatusCounts } from "@/lib/jobs-service";
import { buildJobsQuery } from "@/lib/jobs-query";

type JobsIndexJob = SerializedJob;

type JobsIndexProps = {
  recruiterName: string;
  organisation?: string | null;
  initialJobs: JobsIndexJob[];
  initialCounts: StatusCounts;
  initialPagination: PaginationMeta;
  initialSearch?: string;
};

type StatusFilterKey = JobStatus | "all";

type StatusFilter = {
  key: StatusFilterKey;
  label: string;
  toneClass: string;
};

export const STATUS_LABEL: Record<JobStatus, string> = {
  draft: "Draft",
  open: "Open",
  screening: "Screening",
  closed: "Closed",
};

export const STATUS_BADGE_CLASS: Record<JobStatus, string> = {
  draft: "bg-[var(--color-rwanda-night)] text-white",
  open: "bg-[var(--color-rwanda-sky-tint)] text-[var(--color-rwanda-sky)]",
  screening: "bg-[var(--color-rwanda-gold-tint)] text-[var(--color-rwanda-gold-text)]",
  closed: "bg-[var(--color-rwanda-hills-tint)] text-[var(--color-rwanda-hills)]",
};

const EMPLOYMENT_LABEL: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
};

const FILTER_TONES: Record<StatusFilterKey, string> = {
  all: "border-[var(--color-rwanda-sky)] bg-white text-[var(--color-rwanda-sky)]",
  draft: "border-[var(--color-rwanda-night)] bg-[var(--color-rwanda-night)]/5 text-[var(--color-rwanda-night)]",
  open: "border-[var(--color-rwanda-sky)] bg-[var(--color-rwanda-sky)]/5 text-[var(--color-rwanda-sky)]",
  screening: "border-[var(--color-rwanda-gold)] bg-[var(--color-rwanda-gold)]/5 text-[var(--color-rwanda-gold-text)]",
  closed: "border-[var(--color-rwanda-hills)] bg-[var(--color-rwanda-hills)]/5 text-[var(--color-rwanda-hills)]",
};

const FILTER_ORDER: StatusFilterKey[] = ["all", "draft", "open", "screening", "closed"];

function createInitialCounts(counts?: StatusCounts): StatusCounts {
  if (!counts) {
    return { all: 0, draft: 0, open: 0, screening: 0, closed: 0 };
  }
  return { ...counts };
}

function countFor(key: StatusFilterKey | JobStatus, counts: StatusCounts): number {
  if (key === "all") {
    return counts.all;
  }
  return counts[key];
}

function formatDate(iso?: string | null) {
  if (!iso) return "Not set";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "Not set";
  }
}

function formatRelativeDistance(iso?: string | null) {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    const diffMs = date.getTime() - Date.now();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (Math.abs(diffDays) > 6) {
      return formatDate(iso);
    }
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (diffDays !== 0) {
      return formatter.format(diffDays, "day");
    }
    return "today";
  } catch {
    return "";
  }
}

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type JobsIndexState = {
  jobs: JobsIndexJob[];
  counts: StatusCounts;
  pagination: PaginationMeta;
  isLoading: boolean;
  error: string | null;
};

export type JobsFetchParams = {
  status?: StatusFilterKey;
  page?: number;
  search?: string;
  fetchImpl?: typeof fetch;
};

export async function performJobsFetch(
  params: JobsFetchParams,
  setState: Dispatch<SetStateAction<JobsIndexState>>,
) {
  const { status, page, search, fetchImpl = fetch } = params;
  const searchParams = buildJobsQuery({ status, search });
  if (page && page > 1) {
    searchParams.set("page", String(page));
  }
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/jobs?${queryString}` : "/api/jobs";

  setState((prev) => ({ ...prev, isLoading: true, error: null }));

  try {
    const response = await fetchImpl(endpoint, { cache: "no-store" });
    const payload = (await response.json()) as {
      success: boolean;
      data?: JobsIndexJob[];
      counts?: StatusCounts;
      pagination?: PaginationMeta;
      error?: string;
    };

    if (!response.ok || !payload.success || !payload.data || !payload.counts || !payload.pagination) {
      throw new Error(payload.error || "Failed to load jobs");
    }

    setState({
      jobs: payload.data,
      counts: payload.counts,
      pagination: payload.pagination,
      isLoading: false,
      error: null,
    });

    return { endpoint, payload } as const;
  } catch (error) {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: error instanceof Error ? error.message : "Failed to load jobs",
    }));
    return null;
  }
}

export function JobsIndex({
  recruiterName,
  organisation,
  initialJobs,
  initialCounts,
  initialPagination,
  initialSearch,
}: JobsIndexProps) {
  const [activeFilter, setActiveFilter] = useState<StatusFilterKey>("all");
  const [searchTerm, setSearchTerm] = useState(initialSearch ?? "");
  const [pendingSearch, setPendingSearch] = useState(initialSearch ?? "");
  const [state, setState] = useState<JobsIndexState>({
    jobs: initialJobs,
    counts: createInitialCounts(initialCounts),
    pagination: initialPagination,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    setState({
      jobs: initialJobs,
      counts: createInitialCounts(initialCounts),
      pagination: initialPagination,
      isLoading: false,
      error: null,
    });
    setActiveFilter("all");
    const resetSearch = initialSearch ?? "";
    setSearchTerm(resetSearch);
    setPendingSearch(resetSearch);
  }, [initialJobs, initialCounts, initialPagination, initialSearch]);

  async function fetchJobs({
    status,
    page,
    search,
  }: {
    status?: StatusFilterKey;
    page?: number;
    search?: string;
  }) {
    await performJobsFetch({ status, page, search }, setState);
  }

  function handleFilterChange(filter: StatusFilterKey) {
    setActiveFilter(filter);
    void fetchJobs({ status: filter, page: 1, search: searchTerm });
  }

  function handlePageChange(direction: "next" | "prev") {
    const nextPage =
      direction === "next"
        ? state.pagination.page + 1
        : Math.max(state.pagination.page - 1, 1);
    void fetchJobs({ status: activeFilter, page: nextPage, search: searchTerm });
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = pendingSearch.trim();
    setSearchTerm(trimmed);
    void fetchJobs({ status: activeFilter, page: 1, search: trimmed });
  }

  const filters: StatusFilter[] = useMemo(
    () =>
      FILTER_ORDER.map((key) => ({
        key,
        label: key === "all" ? "All roles" : STATUS_LABEL[key],
        toneClass: FILTER_TONES[key],
      })),
    [],
  );

  const visibleJobs = state.jobs;

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,_#F8FBFF_0%,_#F5F5F7_48%,_#EEF6F1_100%)] pb-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pt-12 md:px-10">
        <header className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/70 p-10 text-[var(--color-rwanda-night)] shadow-[0_40px_90px_rgba(12,26,35,0.12)] backdrop-blur-xl">
          <div className="pointer-events-none absolute -top-32 right-0 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_top,_rgba(11,79,138,0.18),_rgba(11,79,138,0))]" />
          <div className="pointer-events-none absolute -bottom-28 left-16 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_top,_rgba(26,140,78,0.15),_rgba(26,140,78,0))]" />
          <div className="relative z-[1] flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-4 py-1 text-xs font-medium text-slate-500 shadow-sm">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-rwanda-sky)]" />
                Recruitment Ops
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-rwanda-night)] md:text-4xl">
                Welcome back, {recruiterName.split(" ")[0]}!
              </h1>
              <p className="mt-3 text-base text-slate-600">
                Manage every open role from one glassy control centre. Track statuses, launch screenings, and
                keep the Rwanda-inspired aesthetic consistent across your hiring pipeline.
              </p>
              {organisation ? (
                <p className="mt-2 text-sm font-medium text-slate-500">{organisation}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Link
                href="/jobs/create"
                className="inline-flex items-center justify-center rounded-full border border-[var(--color-rwanda-sky)] bg-[var(--color-rwanda-sky)] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(11,79,138,0.35)] transition-transform hover:-translate-y-0.5"
              >
                Create new role
              </Link>
              <Link
                href="/workspace"
                className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/30 px-6 py-3 text-sm font-semibold text-[var(--color-rwanda-sky)] backdrop-blur"
              >
                Open AI workspace
              </Link>
            </div>
          </div>
          <dl className="relative z-[1] mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filters.map((filter) => (
              <div
                key={filter.key}
                className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-[0_20px_45px_rgba(12,26,35,0.08)] backdrop-blur"
              >
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{filter.label}</dt>
                <dd className="mt-3 flex items-baseline gap-2 text-3xl font-semibold text-[var(--color-rwanda-night)]">
                  {countFor(filter.key, state.counts)}
                  <span className="text-sm font-medium text-slate-400">roles</span>
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <nav className="flex flex-wrap items-center gap-3 md:gap-4">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => handleFilterChange(filter.key)}
                className={classNames(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                  filter.toneClass,
                  isActive ? "shadow-[0_12px_30px_rgba(12,26,35,0.18)] scale-[1.02]" : "opacity-70 hover:opacity-100",
                )}
              >
                <span>{filter.label}</span>
                <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-white/50 px-1 text-xs text-[var(--color-rwanda-night)]">
                  {countFor(filter.key, state.counts)}
                </span>
              </button>
            );
          })}
          </nav>
          <div className="flex w-full max-w-md items-center gap-3 rounded-full border border-white/70 bg-white/60 px-4 py-2 backdrop-blur">
            <input
              value={pendingSearch}
              onChange={(event) => setPendingSearch(event.target.value)}
              placeholder="Search job titles"
              className="flex-1 bg-transparent text-sm text-[var(--color-rwanda-night)] outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="rounded-full border border-[var(--color-rwanda-sky)] bg-[var(--color-rwanda-sky)] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(11,79,138,0.3)]"
              disabled={state.isLoading}
            >
              Search
            </button>
          </div>
        </form>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {state.isLoading ? (
            <div className="col-span-full flex justify-center">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-[var(--color-rwanda-sky)]/40 border-t-[var(--color-rwanda-sky)]" />
            </div>
          ) : null}
          {!state.isLoading && state.error ? (
            <div className="col-span-full rounded-[28px] border border-[var(--color-rwanda-imigongo)]/30 bg-[var(--color-rwanda-imigongo)]/10 p-6 text-center text-sm text-[var(--color-rwanda-imigongo)]">
              {state.error}
            </div>
          ) : null}
          {!state.isLoading && !state.error
            ? visibleJobs.map((job) => (
            <article
              key={job.id}
              className="flex flex-col gap-6 rounded-[28px] border border-white/60 bg-white/70 p-7 text-[var(--color-rwanda-night)] shadow-[0_20px_50px_rgba(12,26,35,0.08)] backdrop-blur-lg transition-transform hover:-translate-y-1 hover:shadow-[0_25px_70px_rgba(12,26,35,0.12)]"
            >
              <header className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <h2 className="text-lg font-semibold">{job.title}</h2>
                  <span className="text-sm text-slate-500">
                    {job.location} · {EMPLOYMENT_LABEL[job.employmentType] ?? job.employmentType}
                  </span>
                </div>
                <span className={classNames("rounded-full px-3 py-1 text-xs font-semibold", STATUS_BADGE_CLASS[job.status])}>
                  {STATUS_LABEL[job.status]}
                </span>
              </header>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Shortlist size</div>
                  <div className="mt-1 text-base font-semibold">Top {job.shortlistSize}</div>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Source</div>
                  <div className="mt-1 text-base font-semibold capitalize">{job.source}</div>
                </div>
              </div>

              <footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-500">
                  Updated <span className="font-medium text-[var(--color-rwanda-sky)]">{formatRelativeDistance(job.updatedAt)}</span>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--color-rwanda-sky)] bg-[var(--color-rwanda-sky)] px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(11,79,138,0.3)] transition-transform hover:-translate-y-0.5"
                  >
                    View detail
                  </Link>
                  <Link
                    href={`/workspace?jobId=${job.id}`}
                    className="inline-flex items-center justify-center rounded-full border border-white/50 bg-white/40 px-5 py-2 text-sm font-semibold text-[var(--color-rwanda-sky)] backdrop-blur"
                  >
                    Open in workspace
                  </Link>
                </div>
              </footer>
            </article>
            ))
            : null}
        </section>

        {!state.isLoading && !state.error && visibleJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-[var(--color-rwanda-sky)]/40 bg-white/60 px-10 py-20 text-center text-[var(--color-rwanda-night)] backdrop-blur">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-rwanda-sky)]/10 text-3xl">🌅</div>
            <h3 className="mt-6 text-2xl font-semibold">No roles in this state yet</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Switch to another status filter or create a new role to kick off your next screening batch. The
              Rwanda palette stays with you throughout the hiring journey.
            </p>
            <Link
              href="/jobs/create"
              className="mt-6 inline-flex items-center justify-center rounded-full border border-[var(--color-rwanda-sky)] bg-[var(--color-rwanda-sky)] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(11,79,138,0.35)]"
            >
              Create a role now
            </Link>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 rounded-[28px] border border-white/60 bg-white/70 p-5 text-sm text-[var(--color-rwanda-night)] shadow-[0_20px_50px_rgba(12,26,35,0.08)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <span>
            Page {state.pagination.page} of {state.pagination.totalPages || 1} · {state.pagination.total} total roles
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePageChange("prev")}
              disabled={state.isLoading || state.pagination.page <= 1}
              className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange("next")}
              disabled={
                state.isLoading ||
                state.pagination.totalPages === 0 ||
                state.pagination.page >= state.pagination.totalPages
              }
              className="rounded-full border border-[var(--color-rwanda-sky)] bg-[var(--color-rwanda-sky)] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_35px_rgba(11,79,138,0.3)] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { JobsIndexJob };
export default JobsIndex;
