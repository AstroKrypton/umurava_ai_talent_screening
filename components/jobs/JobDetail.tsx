"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STATUS_BADGE_CLASS, STATUS_LABEL, type JobsIndexJob } from "@/components/jobs/JobsIndex";

type JobDetailJob = JobsIndexJob & {
  description: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  minExperienceYears: number;
  educationLevel: string;
};

type ScreeningSnapshot = {
  status: "pending" | "processing" | "completed" | "failed";
  createdAt?: string | null;
  processingTimeMs?: number | null;
};

type JobDetailMetrics = {
  applicantCount: number;
  screeningCount: number;
  latestScreening?: ScreeningSnapshot | null;
};

type ApplicantListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  location: string;
  source: "umurava" | "external";
  skills: Array<{ name: string; level?: string; yearsOfExperience?: number }>;
  createdAt: string | null;
  resumeUrl?: string | null;
};

type ScreeningListItem = {
  id: string;
  status: ScreeningSnapshot["status"];
  totalApplicants: number;
  shortlistSize: number;
  processingTimeMs?: number | null;
  createdAt: string | null;
  aiModelVersion?: string | null;
  promptVersion?: string | null;
  errorMessage?: string | null;
};

type AsyncListState<TItem> = {
  items: TItem[] | null;
  isLoading: boolean;
  error: string | null;
};

type AsyncListStateSetter<TItem> = (
  value:
    | AsyncListState<TItem>
    | ((prev: AsyncListState<TItem>) => AsyncListState<TItem>),
) => void;

type ToastVariant = "info" | "success" | "warning" | "error";

type ToastMessage = {
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ApplicantsFetchArgs = {
  jobId: string;
  fetchImpl?: typeof fetch;
};

type ScreeningsFetchArgs = {
  jobId: string;
  shortlistSize: number;
  fetchImpl?: typeof fetch;
};

const DEFAULT_APPLICANT_ERROR = "Unable to load applicants.";
const DEFAULT_SCREENING_ERROR = "Unable to load screenings.";

function normalizeApplicant(raw: Record<string, unknown>): ApplicantListItem {
  const skills = Array.isArray(raw.skills)
    ? (raw.skills as Array<Record<string, unknown>>).map((skill) => ({
        name: String(skill?.name ?? "Unnamed skill"),
        level: typeof skill?.level === "string" ? (skill.level as string) : undefined,
        yearsOfExperience:
          typeof skill?.yearsOfExperience === "number" ? (skill.yearsOfExperience as number) : undefined,
      }))
    : [];

  return {
    id: String(raw.id ?? raw._id ?? safeRandomId("applicant")),
    firstName: String(raw.firstName ?? ""),
    lastName: String(raw.lastName ?? ""),
    email: String(raw.email ?? ""),
    headline: String(raw.headline ?? ""),
    location: String(raw.location ?? "Unknown"),
    source: (raw.source === "external" ? "external" : "umurava") as ApplicantListItem["source"],
    skills,
    createdAt: toIsoString(raw.createdAt),
    resumeUrl: raw.resumeUrl ? String(raw.resumeUrl) : null,
  };
}

function normalizeScreening(raw: Record<string, unknown>, fallbackShortlistSize: number): ScreeningListItem {
  const status =
    raw.status === "pending" ||
    raw.status === "processing" ||
    raw.status === "completed" ||
    raw.status === "failed"
      ? (raw.status as ScreeningListItem["status"])
      : "pending";

  return {
    id: String(raw.id ?? raw._id ?? safeRandomId("screening")),
    status,
    totalApplicants: typeof raw.totalApplicants === "number" ? (raw.totalApplicants as number) : 0,
    shortlistSize:
      typeof raw.shortlistSize === "number" ? (raw.shortlistSize as number) : fallbackShortlistSize,
    processingTimeMs:
      typeof raw.processingTimeMs === "number" ? (raw.processingTimeMs as number) : undefined,
    createdAt: toIsoString(raw.createdAt),
    aiModelVersion: raw.aiModelVersion ? String(raw.aiModelVersion) : null,
    promptVersion: raw.promptVersion ? String(raw.promptVersion) : null,
    errorMessage: raw.errorMessage ? String(raw.errorMessage) : null,
  };
}

export async function performApplicantsFetch(
  { jobId, fetchImpl = fetch }: ApplicantsFetchArgs,
  setState: AsyncListStateSetter<ApplicantListItem>,
) {
  const endpoint = `/api/jobs/${jobId}/applicants`;
  setState((prev) => ({ ...prev, isLoading: true, error: null }));

  try {
    const response = await fetchImpl(endpoint, { cache: "no-store" });
    const payload = (await response.json()) as {
      success: boolean;
      data?: Array<Record<string, unknown>>;
      error?: string;
    };

    if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
      throw new Error(payload.error || DEFAULT_APPLICANT_ERROR);
    }

    const normalized = payload.data.map((item) => normalizeApplicant(item));
    setState({ items: normalized, isLoading: false, error: null });
    return { endpoint };
  } catch (error) {
    setState((prev) => ({
      items: prev.items,
      isLoading: false,
      error: error instanceof Error ? error.message : DEFAULT_APPLICANT_ERROR,
    }));
    return null;
  }
}

export async function performScreeningsFetch(
  { jobId, shortlistSize, fetchImpl = fetch }: ScreeningsFetchArgs,
  setState: AsyncListStateSetter<ScreeningListItem>,
) {
  const endpoint = `/api/jobs/${jobId}/screenings`;
  setState((prev) => ({ ...prev, isLoading: true, error: null }));

  try {
    const response = await fetchImpl(endpoint, { cache: "no-store" });
    const payload = (await response.json()) as {
      success: boolean;
      data?: Array<Record<string, unknown>>;
      error?: string;
    };

    if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
      throw new Error(payload.error || DEFAULT_SCREENING_ERROR);
    }

    const normalized = payload.data.map((item) => normalizeScreening(item, shortlistSize));
    setState({ items: normalized, isLoading: false, error: null });
    return { endpoint };
  } catch (error) {
    setState((prev) => ({
      items: prev.items,
      isLoading: false,
      error: error instanceof Error ? error.message : DEFAULT_SCREENING_ERROR,
    }));
    return null;
  }
}

type JobDetailProps = {
  recruiterName: string;
  organisation?: string | null;
  job: JobDetailJob;
  metrics: JobDetailMetrics;
};

type TabKey = "overview" | "applicants" | "screenings";

type TabDefinition = {
  key: TabKey;
  label: string;
  accentClass: string;
};

const TABS: TabDefinition[] = [
  { key: "overview", label: "Overview", accentClass: "from-[var(--color-rwanda-sky)] to-[var(--color-rwanda-hills)]" },
  { key: "applicants", label: "Applicants", accentClass: "from-[var(--color-rwanda-gold)] to-[var(--color-rwanda-sky)]" },
  { key: "screenings", label: "Screenings", accentClass: "from-[var(--color-rwanda-hills)] to-[var(--color-rwanda-imigongo)]" },
];

const EDUCATION_LABEL: Record<string, string> = {
  any: "Any level",
  bachelor: "Bachelor's degree",
  master: "Master's degree",
  phd: "PhD",
};

const SCREENING_STATUS_TONE: Record<ScreeningSnapshot["status"], string> = {
  pending: "bg-[var(--color-rwanda-gold)]/15 text-[var(--color-rwanda-gold-text)]",
  processing: "bg-[var(--color-rwanda-sky)]/15 text-[var(--color-rwanda-sky)]",
  completed: "bg-[var(--color-rwanda-hills)]/15 text-[var(--color-rwanda-hills)]",
  failed: "bg-[var(--color-rwanda-imigongo)]/15 text-[var(--color-rwanda-imigongo)]",
};

const APPLICANT_SOURCE_TONE: Record<ApplicantListItem["source"], string> = {
  umurava: "bg-[var(--color-rwanda-hills)]/15 text-[var(--color-rwanda-hills)]",
  external: "bg-[var(--color-rwanda-imigongo)]/10 text-[var(--color-rwanda-imigongo)]",
};

const TOAST_TONE: Record<ToastVariant, { dot: string; panel: string; text: string; button: string }> = {
  success: {
    dot: "bg-[var(--color-rwanda-hills)]",
    panel: "border-[var(--color-rwanda-hills)]/20 bg-[var(--color-rwanda-hills)]/10",
    text: "text-[var(--color-rwanda-hills)]",
    button: "hover:bg-white/80 text-[var(--color-rwanda-hills)]",
  },
  warning: {
    dot: "bg-[var(--color-rwanda-gold)]",
    panel: "border-[var(--color-rwanda-gold)]/25 bg-[var(--color-rwanda-gold)]/12",
    text: "text-[var(--color-rwanda-gold-text)]",
    button: "hover:bg-white/85 text-[var(--color-rwanda-gold-text)]",
  },
  error: {
    dot: "bg-[var(--color-rwanda-imigongo)]",
    panel: "border-[var(--color-rwanda-imigongo)]/25 bg-[var(--color-rwanda-imigongo-tint)]",
    text: "text-[var(--color-rwanda-imigongo)]",
    button: "hover:bg-white/85 text-[var(--color-rwanda-imigongo)]",
  },
  info: {
    dot: "bg-[var(--color-rwanda-sky)]",
    panel: "border-[var(--color-rwanda-sky)]/20 bg-[var(--color-rwanda-sky)]/10",
    text: "text-[var(--color-rwanda-sky)]",
    button: "hover:bg-white/85 text-[var(--color-rwanda-sky)]",
  },
};

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function safeRandomId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const asString = String(value);
  const parsed = new Date(asString);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
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

function formatProcessing(processingMs?: number | null) {
  if (!processingMs || processingMs < 0) return "—";
  if (processingMs < 1000) return `${processingMs} ms`;
  const seconds = processingMs / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function JobDetail({ recruiterName, organisation, job, metrics }: JobDetailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [applicantsState, setApplicantsState] = useState<AsyncListState<ApplicantListItem>>({
    items: null,
    isLoading: false,
    error: null,
  });
  const [screeningsState, setScreeningsState] = useState<AsyncListState<ScreeningListItem>>({
    items: null,
    isLoading: false,
    error: null,
  });
  const [isTriggeringScreening, setIsTriggeringScreening] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applicantItems = applicantsState.items ?? [];
  const screeningItems = screeningsState.items ?? [];

  const fetchApplicants = useCallback(() => {
    return performApplicantsFetch({ jobId: job.id }, setApplicantsState);
  }, [job.id]);

  const fetchScreenings = useCallback(() => {
    return performScreeningsFetch({ jobId: job.id, shortlistSize: job.shortlistSize }, setScreeningsState);
  }, [job.id, job.shortlistSize]);

  const handleApplicantsRefresh = useCallback(() => {
    void fetchApplicants();
  }, [fetchApplicants]);

  const handleScreeningsRefresh = useCallback(() => {
    void fetchScreenings();
  }, [fetchScreenings]);

  const showToast = useCallback((message: ToastMessage, timeoutMs = 5200) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(message);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, timeoutMs);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  useEffect(() => {
    void fetchApplicants();
    void fetchScreenings();
  }, [fetchApplicants, fetchScreenings]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleRunScreening = useCallback(async () => {
    if (isTriggeringScreening) return;

    const applicantCount = applicantItems.length > 0 ? applicantItems.length : metrics.applicantCount;
    if (applicantCount > 20) {
      showToast({
        title: "System notice",
        description: `Notice: You are screening ${applicantCount} applicants. For the best AI accuracy and detailed reasoning, Umurava recommends batches of 20 or fewer.`,
        variant: "warning",
      });
      return;
    }

    if (applicantCount === 0) {
      showToast({
        title: "Add applicants first",
        description: "Include candidates in the pool before launching an AI screening run.",
        variant: "info",
      });
      return;
    }

    setIsTriggeringScreening(true);
    try {
      const response = await fetch(`/api/screenings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: { id: string };
        error?: string;
        message?: string;
      };

      if (!response.ok || !payload.success) {
        const message = payload.message || payload.error || "Unable to run screening.";
        showToast({
          title: "Screening not started",
          description: message,
          variant: "error",
        });
        return;
      }

      showToast({
        title: "Screening launched",
        description: "We’ll refresh the shortlist as soon as results are ready.",
        variant: "success",
      });
      void fetchScreenings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to run screening.";
      showToast({
        title: "Screening not started",
        description: message,
        variant: "error",
      });
    } finally {
      setIsTriggeringScreening(false);
    }
  }, [applicantItems.length, fetchScreenings, isTriggeringScreening, job.id, metrics.applicantCount, showToast]);

  const applicantCountDisplay = applicantsState.items ? applicantsState.items.length : metrics.applicantCount;
  const screeningCountDisplay = screeningsState.items ? screeningsState.items.length : metrics.screeningCount;

  const latestScreeningSnapshot = useMemo<ScreeningSnapshot | null>(() => {
    if (screeningsState.items && screeningsState.items.length > 0) {
      const first = screeningsState.items[0];
      return {
        status: first.status,
        createdAt: first.createdAt,
        processingTimeMs: first.processingTimeMs ?? null,
      };
    }
    return metrics.latestScreening ?? null;
  }, [metrics.latestScreening, screeningsState.items]);

  const latestScreeningStatusBadge = useMemo(() => {
    if (!latestScreeningSnapshot) return null;
    return (
      <span
        className={classNames(
          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
          SCREENING_STATUS_TONE[latestScreeningSnapshot.status],
        )}
      >
        {latestScreeningSnapshot.status.toUpperCase()}
      </span>
    );
  }, [latestScreeningSnapshot]);

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,_#F2F7FF_0%,_#F5F5F7_55%,_#EEF6F1_100%)] pb-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 pt-10 md:px-10">
        {toast ? (
          <div
            className={classNames(
              "fixed right-6 top-6 z-50 flex max-w-sm items-start gap-3 rounded-3xl border px-5 py-4 backdrop-blur",
              TOAST_TONE[toast.variant].panel,
            )}
          >
            <span className={classNames("mt-1 h-2 w-2 rounded-full", TOAST_TONE[toast.variant].dot)} />
            <div className={classNames("min-w-0 flex-1", TOAST_TONE[toast.variant].text)}>
              <div className="text-sm font-semibold">{toast.title}</div>
              {toast.description ? <div className="mt-1 text-xs opacity-80">{toast.description}</div> : null}
            </div>
            <button
              type="button"
              onClick={dismissToast}
              className={classNames(
                "rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition",
                TOAST_TONE[toast.variant].button,
              )}
            >
              Close
            </button>
          </div>
        ) : null}

        <header className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/70 p-9 text-[var(--color-rwanda-night)] shadow-[0_38px_95px_rgba(12,26,35,0.12)] backdrop-blur-xl">
          <div className="pointer-events-none absolute -top-32 right-8 h-60 w-60 rounded-full bg-[radial-gradient(circle_at_top,_rgba(245,197,24,0.18),_rgba(245,197,24,0))]" />
          <div className="pointer-events-none absolute -bottom-28 left-10 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(11,79,138,0.16),_rgba(11,79,138,0))]" />
          <div className="relative z-[1] flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-1 text-xs font-semibold text-slate-500 shadow-sm hover:text-[var(--color-rwanda-sky)]"
              >
                ← Back to all jobs
              </Link>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[var(--color-rwanda-night)] md:text-4xl">
                {job.title}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Owned by {recruiterName}
                {organisation ? ` · ${organisation}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={classNames(
                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                    STATUS_BADGE_CLASS[job.status],
                  )}
                >
                  {STATUS_LABEL[job.status]}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur">
                  📍 {job.location}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur">
                  🕑 Updated {formatRelativeDistance(job.updatedAt)}
                </span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/70 bg-white/75 px-5 py-4 shadow-[0_20px_45px_rgba(12,26,35,0.08)]">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Applicants</div>
                <div className="mt-2 text-2xl font-semibold">{applicantCountDisplay}</div>
                <p className="mt-1 text-xs text-slate-500">In pipeline</p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/75 px-5 py-4 shadow-[0_20px_45px_rgba(12,26,35,0.08)]">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Screenings</div>
                <div className="mt-2 text-2xl font-semibold">{screeningCountDisplay}</div>
                <p className="mt-1 text-xs text-slate-500">Automated runs</p>
              </div>
            </div>
          </div>
        </header>

        <nav className="flex flex-wrap items-center gap-3">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={classNames(
                  "relative overflow-hidden rounded-full border border-white/70 bg-white/60 px-5 py-2 text-sm font-semibold text-[var(--color-rwanda-night)] backdrop-blur transition-transform",
                  isActive ? "-translate-y-0.5 shadow-[0_16px_40px_rgba(12,26,35,0.1)]" : "opacity-70 hover:opacity-100",
                )}
              >
                <span>{tab.label}</span>
                {isActive ? (
                  <span
                    className={classNames(
                      "pointer-events-none absolute inset-0 -z-[1] rounded-full bg-gradient-to-r opacity-60",
                      tab.accentClass,
                    )}
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        {activeTab === "overview" ? (
          <section className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_22px_60px_rgba(12,26,35,0.08)]">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Role basics</h2>
                <dl className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <dt>Employment type</dt>
                    <dd className="font-medium text-[var(--color-rwanda-night)] capitalize">{job.employmentType}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Location</dt>
                    <dd className="font-medium text-[var(--color-rwanda-night)]">{job.location}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Experience minimum</dt>
                    <dd className="font-medium text-[var(--color-rwanda-night)]">{job.minExperienceYears}+ years</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Education</dt>
                    <dd className="font-medium text-[var(--color-rwanda-night)]">{EDUCATION_LABEL[job.educationLevel] ?? job.educationLevel}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Shortlist size</dt>
                    <dd className="font-medium text-[var(--color-rwanda-night)]">Top {job.shortlistSize}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Source</dt>
                    <dd className="font-medium text-[var(--color-rwanda-night)] capitalize">{job.source}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_22px_60px_rgba(12,26,35,0.08)]">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Timeline</h2>
                <dl className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <dt>Created</dt>
                    <dd className="font-medium text-[var(--color-rwanda-night)]">{formatDate(job.createdAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Last updated</dt>
                    <dd className="font-medium text-[var(--color-rwanda-night)]">{formatDate(job.updatedAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Latest screening</dt>
                    <dd className="flex items-center gap-2 font-medium text-[var(--color-rwanda-night)]">
                      {latestScreeningSnapshot ? formatDate(latestScreeningSnapshot.createdAt) : "No runs yet"}
                      {latestScreeningStatusBadge}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Processing time</dt>
                    <dd className="font-medium text-[var(--color-rwanda-night)]">
                      {latestScreeningSnapshot ? formatProcessing(latestScreeningSnapshot.processingTimeMs) : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <article className="rounded-[32px] border border-white/70 bg-white/80 p-8 text-[var(--color-rwanda-night)] shadow-[0_28px_70px_rgba(12,26,35,0.1)] backdrop-blur">
              <h2 className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">Role mission</h2>
              <p className="mt-4 whitespace-pre-line text-base leading-7 text-slate-600">{job.description}</p>
            </article>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_22px_60px_rgba(12,26,35,0.08)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Must have skills</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.requiredSkills.length ? (
                    job.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-[var(--color-rwanda-sky)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-rwanda-sky)]"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No skills logged yet</span>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_22px_60px_rgba(12,26,35,0.08)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Nice to haves</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.niceToHaveSkills.length ? (
                    job.niceToHaveSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-[var(--color-rwanda-hills)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-rwanda-hills)]"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No optional skills captured</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "applicants" ? (
          <section className="rounded-[32px] border border-white/70 bg-white/80 p-8 text-[var(--color-rwanda-night)] shadow-[0_26px_68px_rgba(12,26,35,0.1)] backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Applicant pipeline</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {applicantCountDisplay} profiles linked to this role. Manage sourcing and ingestion workflows inside the
                  workspace for CSV, PDF, and Umurava-native candidates.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleApplicantsRefresh}
                  disabled={applicantsState.isLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-semibold text-slate-600 backdrop-blur disabled:opacity-40"
                >
                  <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-rwanda-sky)]" />
                  Refresh
                </button>
                <Link
                  href={`/workspace?jobId=${job.id}&pane=applicants`}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-rwanda-sky)] bg-[var(--color-rwanda-sky)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_38px_rgba(11,79,138,0.32)]"
                >
                  Manage applicants
                </Link>
              </div>
            </div>

            {applicantsState.error ? (
              <div className="mt-6 rounded-3xl border border-[var(--color-rwanda-imigongo)]/30 bg-[var(--color-rwanda-imigongo)]/10 p-6 text-sm text-[var(--color-rwanda-imigongo)]">
                {applicantsState.error}
              </div>
            ) : null}

            {applicantsState.isLoading && applicantItems.length === 0 ? (
              <div className="mt-10 flex justify-center">
                <div className="h-14 w-14 animate-spin rounded-full border-4 border-[var(--color-rwanda-sky)]/40 border-t-[var(--color-rwanda-sky)]" />
              </div>
            ) : null}

            {!applicantsState.isLoading && !applicantsState.error && applicantItems.length === 0 ? (
              <div className="mt-10 rounded-3xl border border-dashed border-[var(--color-rwanda-sky)]/30 bg-white/70 p-10 text-center text-sm text-slate-500">
                No applicants yet. Launch sourcing or import resumes from CSV/PDF to populate the pipeline.
              </div>
            ) : null}

            {applicantItems.length > 0 ? (
              <div className="relative mt-8 overflow-hidden rounded-[28px] border border-white/60 bg-white/70 shadow-[0_20px_55px_rgba(12,26,35,0.1)]">
                {applicantsState.isLoading ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-rwanda-sky)]/30 border-t-[var(--color-rwanda-sky)]" />
                  </div>
                ) : null}
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="bg-white/80 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Candidate</th>
                      <th className="px-6 py-4 font-semibold">Headline</th>
                      <th className="px-6 py-4 font-semibold">Core skills</th>
                      <th className="px-6 py-4 font-semibold">Location</th>
                      <th className="px-6 py-4 font-semibold">Added</th>
                      <th className="px-6 py-4 font-semibold text-right">Resume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicantItems.map((applicant) => {
                      const fullName = `${applicant.firstName} ${applicant.lastName}`.trim();
                      const headline = applicant.headline || "No headline provided";
                      const topSkills = applicant.skills.slice(0, 3);
                      return (
                        <tr key={applicant.id} className="border-t border-white/60 bg-white/60">
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-2">
                              <span className="text-sm font-semibold text-[var(--color-rwanda-night)]">{fullName || "Unnamed candidate"}</span>
                              <span
                                className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-semibold ${APPLICANT_SOURCE_TONE[applicant.source]}`}
                              >
                                {applicant.source === "umurava" ? "Umurava" : "External"}
                              </span>
                              <span className="text-xs text-slate-400">{applicant.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-sm text-slate-500">{headline}</td>
                          <td className="px-6 py-5">
                            <div className="flex flex-wrap gap-2">
                              {topSkills.length > 0
                                ? topSkills.map((skill) => (
                                    <span
                                      key={`${applicant.id}-${skill.name}`}
                                      className="rounded-full bg-[var(--color-rwanda-sky)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-rwanda-sky)]"
                                    >
                                      {skill.name}
                                    </span>
                                  ))
                                : (
                                    <span className="text-xs text-slate-400">No skills logged</span>
                                  )}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-sm text-slate-500">{applicant.location}</td>
                          <td className="px-6 py-5 text-sm text-slate-500">{formatDate(applicant.createdAt)}</td>
                          <td className="px-6 py-5 text-sm text-slate-500">
                            {applicant.resumeUrl ? (
                              <a
                                href={applicant.resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-rwanda-sky)]/40 px-3 py-1 text-xs font-semibold text-[var(--color-rwanda-sky)] hover:border-[var(--color-rwanda-sky)]"
                              >
                                View
                              </a>
                            ) : (
                              <span className="flex justify-end text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "screenings" ? (
          <section className="rounded-[32px] border border-white/70 bg-white/80 p-8 text-[var(--color-rwanda-night)] shadow-[0_26px_68px_rgba(12,26,35,0.1)] backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Screening runs</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Track AI-powered screening batches, monitor progress, and review recommendations powered by Gemini.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleScreeningsRefresh}
                  disabled={screeningsState.isLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-semibold text-slate-600 backdrop-blur disabled:opacity-40"
                >
                  <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-rwanda-hills)]" />
                  Refresh
                </button>
                <button
                  onClick={() => void handleRunScreening()}
                  disabled={isTriggeringScreening}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-rwanda-hills)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_38px_rgba(26,140,78,0.28)] transition hover:bg-[var(--color-rwanda-hills)]/90 disabled:opacity-60"
                >
                  {isTriggeringScreening ? "Launching…" : "Run screening"}
                </button>
                <Link
                  href={`/workspace?jobId=${job.id}&pane=screenings`}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-rwanda-hills)] bg-[var(--color-rwanda-hills)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_38px_rgba(26,140,78,0.28)]"
                >
                  Open screenings console
                </Link>
              </div>
            </div>

            {screeningsState.error ? (
              <div className="mt-6 rounded-3xl border border-[var(--color-rwanda-imigongo)]/30 bg-[var(--color-rwanda-imigongo)]/10 p-6 text-sm text-[var(--color-rwanda-imigongo)]">
                {screeningsState.error}
              </div>
            ) : null}

            {screeningsState.isLoading && screeningItems.length === 0 ? (
              <div className="mt-10 flex justify-center">
                <div className="h-14 w-14 animate-spin rounded-full border-4 border-[var(--color-rwanda-hills)]/40 border-t-[var(--color-rwanda-hills)]" />
              </div>
            ) : null}

            {!screeningsState.isLoading && !screeningsState.error && screeningItems.length === 0 ? (
              <div className="mt-10 rounded-3xl border border-dashed border-[var(--color-rwanda-gold)]/30 bg-white/70 p-10 text-center text-sm text-slate-500">
                No AI screenings triggered yet. Run a screening from the workspace once you have a healthy applicant pool.
              </div>
            ) : null}

            {screeningItems.length > 0 ? (
              <div className="relative mt-8 overflow-hidden rounded-[28px] border border-white/60 bg-white/70 shadow-[0_20px_55px_rgba(12,26,35,0.1)]">
                {screeningsState.isLoading ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/55 backdrop-blur-sm">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-rwanda-hills)]/30 border-t-[var(--color-rwanda-hills)]" />
                  </div>
                ) : null}
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="bg-white/80 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Run date</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">Applicants</th>
                      <th className="px-6 py-4 font-semibold">Shortlist</th>
                      <th className="px-6 py-4 font-semibold">Processing</th>
                      <th className="px-6 py-4 font-semibold">Model</th>
                      <th className="px-6 py-4 font-semibold text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {screeningItems.map((screening) => (
                      <tr key={screening.id} className="border-t border-white/60 bg-white/60">
                        <td className="px-6 py-5 text-sm text-slate-500">{formatDate(screening.createdAt)}</td>
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${SCREENING_STATUS_TONE[screening.status]}`}
                          >
                            {screening.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-500">{screening.totalApplicants}</td>
                        <td className="px-6 py-5 text-sm text-slate-500">Top {screening.shortlistSize}</td>
                        <td className="px-6 py-5 text-sm text-slate-500">{formatProcessing(screening.processingTimeMs)}</td>
                        <td className="px-6 py-5 text-sm text-slate-500">
                          <div className="flex flex-col gap-1 text-xs text-slate-400">
                            <span>Model: {screening.aiModelVersion || "—"}</span>
                            <span>Prompt: {screening.promptVersion || "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right text-sm text-slate-500">
                          <Link
                            href={`/screenings/${screening.id}`}
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-rwanda-hills)]/40 px-3 py-1 text-xs font-semibold text-[var(--color-rwanda-hills)] hover:border-[var(--color-rwanda-hills)]"
                          >
                            View
                          </Link>
                          {screening.errorMessage ? (
                            <p className="mt-2 text-xs text-[var(--color-rwanda-imigongo)]">
                              {screening.errorMessage}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

export type {
  JobDetailJob,
  JobDetailMetrics,
  ApplicantListItem,
  ScreeningListItem,
  AsyncListState,
  AsyncListStateSetter,
};
export default JobDetail;
