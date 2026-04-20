"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, PencilLine, Trash2, X } from "lucide-react";
import { buildJobsQuery } from "@/lib/jobs-query";
import { AIFairnessGuard } from "@/components/jobs/AIFairnessGuard";
import { EscaladeLoader } from "@/src/components/ui/EscaladeLoader";
import { OverallScoreGauge } from "@/src/components/ui/OverallScoreGauge";
import { useMounted } from "@/src/hooks/useMounted";
import { InclusionInsightsModal } from "@/components/workspace/InclusionInsightsModal";
import type { InclusionInsightsReport } from "@/src/types/insights";

type JobRecord = {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  minExperienceYears: number;
  educationLevel: "any" | "bachelor" | "master" | "phd";
  location: string;
  employmentType: "full-time" | "part-time" | "contract";
  shortlistSize: 10 | 20;
  status: "draft" | "open" | "screening" | "closed";
  source: "umurava" | "external";
  createdAt?: string;
  updatedAt?: string;
};

const SCREENING_STORAGE_KEY = "umurava.activeScreening";
const SCREENING_POLL_INTERVAL_MS = 3000;
const SCREENING_MAX_POLL_RETRIES = 20;

type StoredScreeningSession = {
  screeningId: string;
  jobId: string;
};

type ScreeningRecord = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  totalApplicants: number;
  shortlistSize: 10 | 20;
  processingTimeMs?: number;
  aiModelVersion?: string;
  promptVersion?: string;
  usedFallback?: boolean;
  error?: string;
};

type ScreeningResultDetail = {
  rank: number;
  applicantId: string;
  applicantName: string;
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  relevanceScore: number;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  isShortlisted: boolean;
  insights?: string[];
};

type ScreeningDetailRecord = {
  id: string;
  jobId: string;
  status: ScreeningRecord["status"];
  totalApplicants: number;
  shortlistSize: 10 | 20;
  results: ScreeningResultDetail[];
  processingTimeMs?: number;
  aiModelVersion?: string;
  promptVersion?: string;
  usedFallback?: boolean;
  error?: string;
  createdAt: string;
};

type ScreeningApiPayload = {
  id: string;
  jobId?: string;
  status: ScreeningRecord["status"];
  totalApplicants: number;
  shortlistSize: 10 | 20;
  results: ScreeningResultDetail[];
  processingTimeMs?: number;
  aiModelVersion?: string;
  promptVersion?: string;
  usedFallback?: boolean;
  error?: string;
  createdAt: string;
  updatedAt?: string;
};

type ScreeningStatusResponse = {
  success: boolean;
  data?: ScreeningApiPayload;
  error?: string;
};

type ScreeningStartResponse = {
  success: boolean;
  data?: { id: string; jobId?: string; status: ScreeningRecord["status"]; createdAt: string };
  error?: string;
  message?: string;
};

type CsvImportSummary = {
  inserted: number;
  updated: number;
  totalProcessed: number;
  warnings: Array<{ row: number; message: string }>;
};

type PdfImportSummary = {
  upserted: number;
  updated: number;
  aiModelVersion?: string;
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
    headline: string;
    location: string;
    skills: Array<{ name: string; level: string; yearsOfExperience: number }>;
    experience: Array<{ company: string; role: string; description: string; startDate: string; endDate: string }>;
    education: Array<{ institution: string; degree: string; fieldOfStudy: string; startDate?: string; endDate?: string }>;
    projects: Array<{ name: string; role: string; description: string; technologies: string[] }>;
    availability: { status: string; type: string; startDate?: string };
  };
};

type CreateJobValues = {
  title: string;
  location: string;
  description: string;
  requiredSkills: string;
  niceToHaveSkills: string;
  minExperienceYears: string;
  educationLevel: "any" | "bachelor" | "master" | "phd";
  employmentType: "full-time" | "part-time" | "contract";
  shortlistSize: 10 | 20;
  source: "umurava" | "external";
  status: "draft" | "open" | "screening" | "closed";
};

type ToastVariant = "success" | "error" | "info";

type ToastMessage = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

const initialJobValues: CreateJobValues = {
  title: "",
  location: "",
  description: "",
  requiredSkills: "",
  niceToHaveSkills: "",
  minExperienceYears: "0",
  educationLevel: "any",
  employmentType: "full-time",
  shortlistSize: 10,
  source: "umurava",
  status: "draft",
};

const statusTone: Record<JobRecord["status"], string> = {
  draft: "bg-slate-200 text-slate-600",
  open: "bg-[#E8F3FC] text-[#0B4F8A]",
  screening: "bg-[#FEF8E1] text-[#7A5C00]",
  closed: "bg-slate-100 text-slate-500",
};

const screeningStatusTone: Record<ScreeningRecord["status"], string> = {
  pending: "bg-[#FEF3C7] text-[#B45309]",
  processing: "bg-[#E0F2FE] text-[#0369A1]",
  completed: "bg-[#D1FAE5] text-[#047857]",
  failed: "bg-[#FEE2E2] text-[#B91C1C]",
};

const screeningDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const DEFAULT_SCREENING_BATCH = 5;
const glassPanelClass = "bg-white/60 backdrop-blur-2xl border border-white/80 shadow-sm rounded-3xl";
const brandGreen = "#0F8A5F";
type SidebarSection = "workspace" | "jobs" | "applicants" | "shortlists";

function formatProcessingDuration(value?: number | null) {
  if (value === undefined || value === null) return null;
  if (value < 1000) {
    return `${value}ms`;
  }
  if (value < 60000) {
    const seconds = value / 1000;
    return `${Number.isInteger(seconds) ? seconds.toFixed(0) : seconds.toFixed(1)}s`;
  }
  const minutes = value / 60000;
  return `${Number.isInteger(minutes) ? minutes.toFixed(0) : minutes.toFixed(1)}m`;
}

export default function JobsWorkspace({
  initialJobs,
  recruiterName,
}: {
  initialJobs: JobRecord[];
  recruiterName: string;
}) {
  const isMounted = useMounted();
  const [jobDialogMode, setJobDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [activeJobTab, setActiveJobTab] = useState<"overview" | "applicants" | "shortlist">("overview");
  const [jobs, setJobs] = useState<JobRecord[]>(initialJobs);
  const [values, setValues] = useState<CreateJobValues>(initialJobValues);
  const [statusFilter, setStatusFilter] = useState<"all" | JobRecord["status"]>("all");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeSidebarSection, setActiveSidebarSection] = useState<SidebarSection>("workspace");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [screenings, setScreenings] = useState<Record<string, ScreeningRecord[]>>({});
  const [screeningsLoading, setScreeningsLoading] = useState<Record<string, boolean>>({});
  const [screeningsError, setScreeningsError] = useState<Record<string, string>>({});
  const [screeningsVisibleCount, setScreeningsVisibleCount] = useState<Record<string, number>>({});
  const [selectedScreening, setSelectedScreening] = useState<string | null>(null);
  const [screeningDetails, setScreeningDetails] = useState<Record<string, ScreeningDetailRecord>>({});
  const [isLoadingScreeningDetail, setIsLoadingScreeningDetail] = useState(false);
  const [screeningDetailError, setScreeningDetailError] = useState("");
  const [selectedResult, setSelectedResult] = useState<ScreeningResultDetail | null>(null);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsReport, setInsightsReport] = useState<InclusionInsightsReport | null>(null);
  const [insightsShortlistId, setInsightsShortlistId] = useState<string | null>(null);
  const scoreBars = useMemo(
    () =>
      selectedResult
        ? [
            { label: "Skills Match", value: selectedResult.skillsScore },
            { label: "Experience", value: selectedResult.experienceScore },
            { label: "Education", value: selectedResult.educationScore },
          ]
        : [],
    [selectedResult],
  );
  const [submitIntent, setSubmitIntent] = useState<"draft" | "publish" | null>(null);
  const [csvSummary, setCsvSummary] = useState<CsvImportSummary | null>(null);
  const [csvErrors, setCsvErrors] = useState<string>("");
  const [csvWarnings, setCsvWarnings] = useState<Array<{ row: number; message: string }>>([]);
  const [csvWarningsExpanded, setCsvWarningsExpanded] = useState(false);
  const [csvIsUploading, setCsvIsUploading] = useState(false);
  const [csvMapping, setCsvMapping] = useState("{}");
  const [csvSource, setCsvSource] = useState<"umurava" | "external">("external");
  const [pdfSummary, setPdfSummary] = useState<PdfImportSummary | null>(null);
  const [pdfError, setPdfError] = useState<string>("");
  const [pdfIsUploading, setPdfIsUploading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screeningPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screeningPollAttemptsRef = useRef(0);
  const [pendingDeleteJob, setPendingDeleteJob] = useState<JobRecord | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const isJobDialogOpen = jobDialogMode !== null;

  async function handleDeleteJob(job: JobRecord) {
    setDeletingJobId(job.id);
    try {
      const response = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      const result = (await response.json()) as { success: boolean; data?: { id: string; status: string }; error?: string };

      if (!response.ok || !result.success) {
        showToast({
          title: "Delete failed",
          description: result.error || "We couldn’t archive this role. Try again shortly.",
          variant: "error",
        });
        return;
      }

      setJobs((current) => current.filter((entry) => entry.id !== job.id));
      if (activeJobId === job.id) {
        setActiveJobId(null);
        setActiveJobTab("overview");
        setSelectedScreening(null);
        setSelectedResult(null);
      }
      showToast({
        title: "Role archived",
        description: `${job.title} is now closed.`,
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to delete job", error);
      showToast({
        title: "Delete failed",
        description: "Something went wrong while archiving the role.",
        variant: "error",
      });
    } finally {
      setDeletingJobId(null);
      setPendingDeleteJob(null);
    }
  }

  function showToast(message: ToastMessage, timeoutMs = 5200) {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    setToast(message);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, timeoutMs);
  }

  function dismissToast() {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }

  const clearScreeningPollTimer = useCallback(() => {
    if (screeningPollTimerRef.current) {
      clearTimeout(screeningPollTimerRef.current);
      screeningPollTimerRef.current = null;
    }
    screeningPollAttemptsRef.current = 0;
  }, []);

  const persistActiveScreening = useCallback((session: StoredScreeningSession | null) => {
    if (typeof window === "undefined") return;
    if (!session) {
      window.localStorage.removeItem(SCREENING_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SCREENING_STORAGE_KEY, JSON.stringify(session));
    }
  }, []);

  const mapApiPayloadToDetail = useCallback(
    (payload: ScreeningApiPayload, fallbackJobId?: string): ScreeningDetailRecord => {
      const jobIdentifier = payload.jobId ?? fallbackJobId ?? "";

      return {
        id: payload.id,
        jobId: jobIdentifier,
        status: payload.status,
        totalApplicants: payload.totalApplicants,
        shortlistSize: payload.shortlistSize,
        results: Array.isArray(payload.results) ? payload.results : [],
        processingTimeMs: payload.processingTimeMs,
        aiModelVersion: payload.aiModelVersion,
        promptVersion: payload.promptVersion,
        usedFallback: payload.usedFallback,
        error: payload.error,
        createdAt: payload.createdAt,
      };
    },
    [],
  );

  const commitScreeningDetail = useCallback((detail: ScreeningDetailRecord) => {
    if (!detail.jobId) return;

    setScreeningDetails((current) => ({
      ...current,
      [detail.id]: detail,
    }));

    const summary: ScreeningRecord = {
      id: detail.id,
      status: detail.status,
      createdAt: detail.createdAt,
      totalApplicants: detail.totalApplicants,
      shortlistSize: detail.shortlistSize,
      processingTimeMs: detail.processingTimeMs,
      aiModelVersion: detail.aiModelVersion,
      promptVersion: detail.promptVersion,
      usedFallback: detail.usedFallback,
      error: detail.error,
    };

    setScreenings((current) => {
      const existing = current[detail.jobId] ?? [];
      const withoutDuplicate = existing.filter((entry) => entry.id !== summary.id);
      return {
        ...current,
        [detail.jobId]: [summary, ...withoutDuplicate],
      };
    });

    setScreeningsVisibleCount((current) => ({
      ...current,
      [detail.jobId]: Math.max(current[detail.jobId] ?? DEFAULT_SCREENING_BATCH, DEFAULT_SCREENING_BATCH),
    }));
  }, []);

  const pollScreeningStatus = useCallback(
    async function poll(session: StoredScreeningSession, attempt = 0): Promise<void> {
      if (attempt >= SCREENING_MAX_POLL_RETRIES) {
        const timeoutMessage = "Screening is taking longer than expected. Please try again.";
        setFormError(timeoutMessage);
        setScreeningDetailError(timeoutMessage);
        showToast({
          title: "Screening timed out",
          description: timeoutMessage,
          variant: "error",
        });

        setScreenings((current) => {
          const jobScreenings = current[session.jobId] ?? [];
          const updated: ScreeningRecord[] = jobScreenings.map((entry) =>
            entry.id === session.screeningId
              ? ({ ...entry, status: "failed" as const, error: timeoutMessage } as ScreeningRecord)
              : entry,
          );
          return { ...current, [session.jobId]: updated };
        });

        setScreeningDetails((current) => {
          const existing = current[session.screeningId];
          if (!existing) return current;
          return {
            ...current,
            [session.screeningId]: {
              ...existing,
              status: "failed" as const,
              error: timeoutMessage,
            } as ScreeningDetailRecord,
          };
        });

        persistActiveScreening(null);
        clearScreeningPollTimer();
        setProcessingJobId((current) => (current === session.jobId ? null : current));
        return;
      }

      screeningPollAttemptsRef.current = attempt;
      try {
        const response = await fetch(`/api/screen/${session.screeningId}`);
        const payload = (await response.json()) as ScreeningStatusResponse;

        if (!response.ok || !payload.success || !payload.data) {
          const message = payload?.error || "Unable to retrieve screening status.";
          setFormError(message);
          setScreeningDetailError(message);
          showToast({
            title: "Screening failed",
            description: message,
            variant: "error",
          });
          persistActiveScreening(null);
          clearScreeningPollTimer();
          setProcessingJobId((current) => (current === session.jobId ? null : current));
          return;
        }

        const data = payload.data;
        const detail = mapApiPayloadToDetail(data, session.jobId);

        if (data.status === "completed") {
          commitScreeningDetail(detail);
          setSelectedScreening(detail.id);
          setSelectedResult(null);
          setScreeningDetailError("");
          screeningPollAttemptsRef.current = 0;

          const jobTitle = jobs.find((job) => job.id === detail.jobId)?.title ?? "this role";
          showToast({
            title: "Screening complete",
            description: `AI shortlist generated for ${jobTitle}.`,
            variant: "success",
          });

          persistActiveScreening(null);
          clearScreeningPollTimer();
          setProcessingJobId((current) => (current === session.jobId ? null : current));
          void refreshJobs();
          return;
        }

        if (data.status === "failed") {
          commitScreeningDetail(detail);
          const message = detail.error || "Screening failed. Try again shortly.";
          setFormError(message);
          setScreeningDetailError(message);
          showToast({
            title: "Screening failed",
            description: message,
            variant: "error",
          });

          persistActiveScreening(null);
          clearScreeningPollTimer();
          setProcessingJobId((current) => (current === session.jobId ? null : current));
          void refreshJobs();
          return;
        }

        commitScreeningDetail(detail);
        setProcessingJobId(session.jobId);
        persistActiveScreening(session);
        clearScreeningPollTimer();
        screeningPollTimerRef.current = setTimeout(() => {
          void poll(session, attempt + 1);
        }, SCREENING_POLL_INTERVAL_MS);
      } catch (error) {
        console.error("Failed to poll screening status", error);
        clearScreeningPollTimer();
        setProcessingJobId(session.jobId);
        persistActiveScreening(session);
        screeningPollTimerRef.current = setTimeout(() => {
          void poll(session, attempt + 1);
        }, SCREENING_POLL_INTERVAL_MS * 2);
      }
    },
    [
      clearScreeningPollTimer,
      commitScreeningDetail,
      jobs,
      mapApiPayloadToDetail,
      persistActiveScreening,
      refreshJobs,
      setScreeningDetailError,
      setFormError,
      showToast,
    ],
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      clearScreeningPollTimer();
    };
  }, [clearScreeningPollTimer]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(SCREENING_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as StoredScreeningSession | null;
      if (!parsed || !parsed.screeningId || !parsed.jobId) {
        window.localStorage.removeItem(SCREENING_STORAGE_KEY);
        return;
      }

      setProcessingJobId(parsed.jobId);
      setScreeningDetailError("");
      setSelectedResult(null);
      clearScreeningPollTimer();
      screeningPollTimerRef.current = setTimeout(() => {
        void pollScreeningStatus(parsed);
      }, 200);
    } catch {
      window.localStorage.removeItem(SCREENING_STORAGE_KEY);
    }
  }, [clearScreeningPollTimer, pollScreeningStatus]);

  const filteredJobs = useMemo(() => {
    if (statusFilter === "all") return jobs;
    return jobs.filter((job) => job.status === statusFilter);
  }, [jobs, statusFilter]);

  const activeJob = useMemo(
    () => (activeJobId ? jobs.find((job) => job.id === activeJobId) ?? null : null),
    [activeJobId, jobs],
  );
  const editingJob = useMemo(
    () => (editingJobId ? jobs.find((job) => job.id === editingJobId) ?? null : null),
    [editingJobId, jobs],
  );
  const isDetailView = Boolean(activeJob);

  const profileStrength = useMemo(() => {
    const trimmedTitle = values.title.trim();
    const trimmedLocation = values.location.trim();
    const trimmedDescription = values.description.trim();
    const requiredSkillTokens = values.requiredSkills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    const checklist = [
      { key: "title", label: "Role title", complete: Boolean(trimmedTitle) },
      { key: "location", label: "Location", complete: Boolean(trimmedLocation) },
      { key: "skills", label: "3+ required skills", complete: requiredSkillTokens.length >= 3 },
      { key: "description", label: "Description", complete: Boolean(trimmedDescription) },
    ] as Array<{ key: string; label: string; complete: boolean }>;

    const completed = checklist.filter((item) => item.complete).length;
    const percent = Math.min(100, Math.max(0, Math.round((completed / checklist.length) * 100)));
    const missingRequiredSkills = Math.max(0, 3 - requiredSkillTokens.length);

    let nudge: string;
    if (!trimmedTitle) {
      nudge = "Complete your draft: Set a clear title so candidates instantly know if it fits.";
    } else if (!trimmedLocation) {
      nudge = "Complete your draft: Add a location so regional talent can raise their hand.";
    } else if (missingRequiredSkills > 0) {
      nudge = `Complete your draft: Add ${missingRequiredSkills} more Required Skill${missingRequiredSkills === 1 ? "" : "s"} to boost AI matching accuracy by 40%.`;
    } else if (!trimmedDescription) {
      nudge = "Complete your draft: Outline responsibilities to help the AI surface stronger matches.";
    } else {
      nudge = "Draft dialed in. Publish to activate AI screening and unlock the shortlist.";
    }

    return {
      checklist,
      percent,
      nudge,
    };
  }, [values.description, values.location, values.requiredSkills, values.title]);

  function setField<K extends keyof CreateJobValues>(field: K, value: CreateJobValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setFormError("");
  }

  const scrollToSection = (sectionId: string) => {
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      const sectionElement = document.getElementById(sectionId);
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
  };

  const handleSidebarNavigation = (section: SidebarSection) => {
    setActiveSidebarSection(section);

    if (section === "workspace") {
      setActiveJobId(null);
      setActiveJobTab("overview");
      setSelectedScreening(null);
      setSelectedResult(null);
      scrollToSection("workspace-root");
      return;
    }

    if (section === "jobs") {
      setActiveJobId(null);
      setActiveJobTab("overview");
      setSelectedScreening(null);
      setSelectedResult(null);
      scrollToSection("jobs-section");
      return;
    }

    const targetJobId = activeJobId ?? filteredJobs[0]?.id ?? jobs[0]?.id ?? null;
    if (!targetJobId) {
      showToast({
        title: "No jobs available",
        description: "Create a role before viewing applicants or shortlists.",
        variant: "info",
      });
      setActiveSidebarSection("jobs");
      scrollToSection("jobs-section");
      return;
    }

    if (section === "applicants") {
      openJobDetail(targetJobId, "applicants");
      return;
    }

    openJobDetail(targetJobId, "shortlist");
  };

  const openJobDetail = (jobId: string, tab: "overview" | "applicants" | "shortlist" = "overview") => {
    setActiveJobId(jobId);
    setSelectedScreening(null);
    setSelectedResult(null);

    if (tab === "applicants") {
      setActiveJobTab("applicants");
      setActiveSidebarSection("applicants");
      scrollToSection("applicants-section");
      return;
    }

    if (tab === "shortlist") {
      setActiveJobTab("shortlist");
      setActiveSidebarSection("shortlists");
      scrollToSection("screenings-section");
      return;
    }

    setActiveJobTab("overview");
    setActiveSidebarSection("jobs");
    scrollToSection("job-detail-top");
  };

  async function refreshScreenings(jobId: string) {
    setScreeningsLoading((current) => ({ ...current, [jobId]: true }));
    setScreeningsError((current) => ({ ...current, [jobId]: "" }));
    try {
      const response = await fetch(`/api/jobs/${jobId}/screenings`);
      const payload = (await response.json()) as {
        success: boolean;
        data?: ScreeningRecord[];
        error?: string;
      };

      if (response.ok && payload.success && payload.data) {
        const nextRecords = payload.data ?? [];
        setScreenings((current) => ({
          ...current,
          [jobId]: nextRecords,
        }));

        setScreeningsVisibleCount((current) => {
          if (current[jobId]) return current;
          return { ...current, [jobId]: Math.min(DEFAULT_SCREENING_BATCH, nextRecords.length || DEFAULT_SCREENING_BATCH) };
        });

        if (jobId === activeJobId) {
          const containsSelection = nextRecords.some((record) => record.id === selectedScreening);
          if (nextRecords.length === 0 || (selectedScreening && !containsSelection)) {
            setSelectedScreening(null);
            setSelectedResult(null);
          }
        }
      } else {
        setScreeningsError((current) => ({ ...current, [jobId]: payload.error || "Unable to load screenings." }));
      }
    } catch (error) {
      console.error("Failed to refresh screenings", error);
      setScreeningsError((current) => ({ ...current, [jobId]: error instanceof Error ? error.message : "Unable to load screenings." }));
    } finally {
      setScreeningsLoading((current) => ({ ...current, [jobId]: false }));
    }
  }

  async function loadScreeningDetail(screeningId: string, jobId: string) {
    if (screeningDetails[screeningId]) {
      setSelectedScreening(screeningId);
      return;
    }

    setIsLoadingScreeningDetail(true);
    setSelectedScreening(screeningId);
    setSelectedResult(null);
    setScreeningDetailError("");

    try {
      const response = await fetch(`/api/screen/${screeningId}`);
      const payload = (await response.json()) as ScreeningStatusResponse;

      if (!response.ok || !payload.success || !payload.data) {
        const message = payload.error || "Unable to load screening details.";
        setFormError(message);
        setScreeningDetailError(message);
        return;
      }

      const detail = mapApiPayloadToDetail(payload.data, jobId);
      commitScreeningDetail(detail);
      setSelectedScreening(detail.id);
      if (!screenings[jobId]) {
        void refreshScreenings(jobId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load screening details.";
      setFormError(message);
      setScreeningDetailError(message);
    } finally {
      setIsLoadingScreeningDetail(false);
    }
  }

  async function handleCsvImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeJob || !csvFile) {
      setCsvErrors("Select a job and CSV file first.");
      return;
    }

    setCsvErrors("");
    setCsvWarnings([]);
    setCsvWarningsExpanded(false);
    setCsvSummary(null);
    setCsvIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      if (csvMapping && csvMapping.trim().length > 0) {
        formData.append("mapping", csvMapping);
      }
      formData.append("source", csvSource);

      const response = await fetch(`/api/jobs/${activeJob.id}/applicants/import/csv`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        success: boolean;
        data?: CsvImportSummary;
        error?: string;
        warnings?: Array<{ row: number; message: string }>;
      };

      if (!response.ok || !payload.success || !payload.data) {
        setCsvErrors(payload.error || "Unable to import CSV. Check mapping or file format.");
        setCsvWarnings(payload.warnings ?? []);
        setCsvWarningsExpanded(false);
        showToast({
          title: payload.error || "CSV import failed",
          description: payload.warnings && payload.warnings.length > 0 ? `First warning: ${payload.warnings[0].message}` : undefined,
          variant: "error",
        });
        return;
      }

      setCsvSummary(payload.data);
      setCsvWarnings(payload.data.warnings ?? []);
      setCsvWarningsExpanded(false);
      setCsvFile(null);
      void refreshJobs();
      showToast({
        title: "CSV import complete",
        description: `Processed ${payload.data.totalProcessed} applicants · ${payload.data.inserted} new · ${payload.data.updated} updated`,
        variant: "success",
      });
    } catch (error) {
      setCsvErrors(error instanceof Error ? error.message : "Unexpected error while importing CSV.");
      showToast({
        title: "CSV import failed",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setCsvIsUploading(false);
    }
  }

  async function handlePdfImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeJob || !pdfFile) {
      setPdfError("Select a job and PDF resume first.");
      return;
    }

    setPdfError("");
    setPdfSummary(null);
    setPdfIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      const response = await fetch(`/api/jobs/${activeJob.id}/applicants/import/pdf`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        success: boolean;
        data?: PdfImportSummary;
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.data) {
        setPdfError(payload.error || "Unable to parse resume. Try a different PDF.");
        showToast({
          title: payload.error || "PDF import failed",
          variant: "error",
        });
        return;
      }

      setPdfSummary(payload.data);
      setPdfFile(null);
      void refreshJobs();
      showToast({
        title: "PDF import complete",
        description: `${payload.data.applicant.firstName} ${payload.data.applicant.lastName} imported successfully`,
        variant: "success",
      });
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Unexpected error while parsing resume.");
      showToast({
        title: "PDF import failed",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setPdfIsUploading(false);
    }
  }

  async function refreshJobs(nextFilter = statusFilter) {
    setIsRefreshing(true);

    try {
      const query = buildJobsQuery({ status: nextFilter });
      const queryString = query.toString();
      const endpoint = queryString ? `/api/jobs?${queryString}` : "/api/jobs";
      const response = await fetch(endpoint, { cache: "no-store" });
      const result = (await response.json()) as { success: boolean; data?: JobRecord[] };

      if (response.ok && result.success && result.data) {
        setJobs(result.data);
        if (activeJobId) {
          const stillExists = result.data.some((job) => job.id === activeJobId);
          if (!stillExists) {
            setActiveJobId(null);
            setSelectedScreening(null);
            setSelectedResult(null);
          }
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  function toFormValues(job: JobRecord): CreateJobValues {
    return {
      title: job.title,
      location: job.location,
      description: job.description,
      requiredSkills: job.requiredSkills.join(", "),
      niceToHaveSkills: job.niceToHaveSkills.join(", "),
      minExperienceYears: String(job.minExperienceYears ?? 0),
      educationLevel: job.educationLevel,
      employmentType: job.employmentType,
      shortlistSize: job.shortlistSize,
      source: job.source,
      status: job.status,
    };
  }

  function openCreateDialog() {
    setFormError("");
    setValues(initialJobValues);
    setEditingJobId(null);
    setJobDialogMode("create");
  }

  function openEditDialog(job: JobRecord) {
    setFormError("");
    setEditingJobId(job.id);
    setValues(toFormValues(job));
    setJobDialogMode("edit");
  }

  function closeJobDialog() {
    setJobDialogMode(null);
    setEditingJobId(null);
    setFormError("");
    setSubmitIntent(null);
  }

  function resetJobForm() {
    setFormError("");
    if (jobDialogMode === "edit" && editingJob) {
      setValues(toFormValues(editingJob));
      return;
    }
    setValues(initialJobValues);
  }

  async function handleSubmitJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submitter = (event.nativeEvent as SubmitEvent | undefined)?.submitter as HTMLButtonElement | null;
    const intent = (submitter?.dataset.intent as "draft" | "publish" | undefined) ?? "publish";
    const wantsDraft = intent === "draft";

    const trimmedTitle = values.title.trim();
    const trimmedLocation = values.location.trim();
    const trimmedDescription = values.description.trim();

    if (!trimmedTitle) {
      setFormError("Give your role at least a working title.");
      return;
    }

    if (!wantsDraft) {
      if (!trimmedLocation) {
        setFormError("Location is required to publish.");
        return;
      }
      if (!trimmedDescription) {
        setFormError("Add a short description before publishing.");
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitIntent(intent);
    setFormError("");

    const normalizedLocation = wantsDraft && !trimmedLocation ? "Location TBD" : trimmedLocation;
    const normalizedDescription = wantsDraft && !trimmedDescription ? "Draft description pending further detail." : trimmedDescription || "Draft description pending further detail.";

    const payloadStatus = (() => {
      if (jobDialogMode === "edit") {
        if (wantsDraft) return "draft" as JobRecord["status"];
        if (values.status === "draft") return "open";
        return values.status;
      }
      return wantsDraft ? "draft" : "open";
    })();

    try {
      const payload = {
        title: trimmedTitle,
        location: normalizedLocation,
        description: normalizedDescription,
        requiredSkills: values.requiredSkills,
        niceToHaveSkills: values.niceToHaveSkills,
        minExperienceYears: Number(values.minExperienceYears || 0),
        educationLevel: values.educationLevel,
        employmentType: values.employmentType,
        shortlistSize: values.shortlistSize,
        source: values.source,
        status: payloadStatus,
      };

      const url = jobDialogMode === "edit" && editingJobId ? `/api/jobs/${editingJobId}` : "/api/jobs";
      const method = jobDialogMode === "edit" ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { success: boolean; data?: JobRecord; error?: string };

      if (!response.ok || !result.success || !result.data) {
        setFormError(result.error || `Unable to ${jobDialogMode === "edit" ? "update" : "create"} job.`);
        return;
      }

      const savedJob = result.data;
      if (jobDialogMode === "edit") {
        setJobs((current) => current.map((job) => (job.id === savedJob.id ? savedJob : job)));
        setActiveJobId(savedJob.id);
      } else {
        setJobs((current) => [savedJob, ...current]);
        setActiveJobId(savedJob.id);
      }

      showToast({
        title: savedJob.status === "draft" ? "Draft saved" : jobDialogMode === "edit" ? "Role updated" : "Role published",
        description:
          savedJob.status === "draft"
            ? "Keep refining the details before you publish."
            : jobDialogMode === "edit"
              ? "Job details saved successfully."
              : "Your new role is live for applicant intake.",
        variant: "success",
      });

      setValues(initialJobValues);
      setJobDialogMode(null);
      setEditingJobId(null);
    } catch {
      setFormError(`Something went wrong while ${jobDialogMode === "edit" ? "updating" : "creating"} the job.`);
    } finally {
      setIsSubmitting(false);
      setSubmitIntent(null);
    }
  }

  async function handleRunScreening(jobId: string | null) {
    if (!jobId) return;

    if (processingJobId) {
      const inFlightJob = jobs.find((item) => item.id === processingJobId);
      showToast({
        title: "Screening in progress",
        description:
          processingJobId === jobId
            ? "We’re already generating this shortlist. Hang tight while the AI finishes."
            : inFlightJob
              ? `${inFlightJob.title} is currently running. Start another screening once it completes.`
              : "Another screening is currently running. Please wait until it finishes.",
        variant: "info",
      });
      return;
    }

    const job = jobs.find((item) => item.id === jobId);
    if (!job) return;
    if (job.status === "draft") {
      showToast({
        title: "Publish required",
        description: "Save this role as published before triggering AI screening.",
        variant: "info",
      });
      return;
    }
    setProcessingJobId(jobId);

    let started = false;
    try {
      const response = await fetch(`/api/screen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const payload = (await response.json()) as ScreeningStartResponse;

      if (!response.ok || !payload.success || !payload.data) {
        const errorMessage = payload.message || payload.error || "Unable to run screening.";
        setFormError(errorMessage);
        showToast({
          title: "Screening not started",
          description: errorMessage,
          variant: "error",
        });
        return;
      }

      started = true;
      const session: StoredScreeningSession = {
        screeningId: payload.data.id,
        jobId,
      };

      persistActiveScreening(session);
      setSelectedResult(null);
      setScreeningDetailError("");
      setSelectedScreening(null);
      clearScreeningPollTimer();
      screeningPollTimerRef.current = setTimeout(() => {
        void pollScreeningStatus(session);
      }, 200);

      showToast({
        title: "Screening launched",
        description: `We’ll refresh ${job.title} once the AI shortlist is ready.`,
        variant: "info",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong while running the screening.";
      setFormError(message);
      showToast({
        title: "Screening not started",
        description: message,
        variant: "error",
      });
    } finally {
      if (!started) {
        setProcessingJobId((current) => (current === jobId ? null : current));
        persistActiveScreening(null);
        clearScreeningPollTimer();
      }
    }
  }

  useEffect(() => {
    if (!activeJob?.id) return;
    if (screenings[activeJob.id]) return;
    void refreshScreenings(activeJob.id);
  }, [activeJob?.id, screenings]);

  useEffect(() => {
    if (!activeJob?.id) return;
    const jobScreenings = screenings[activeJob.id];
    if (!jobScreenings || jobScreenings.length === 0) return;

    const hasSelection = selectedScreening && jobScreenings.some((record) => record.id === selectedScreening);
    if (!hasSelection && !isLoadingScreeningDetail) {
      void loadScreeningDetail(jobScreenings[0].id, activeJob.id);
    }
  }, [activeJob?.id, screenings, selectedScreening, isLoadingScreeningDetail]);

  const handleShowMoreScreenings = (jobId: string) => {
    setScreeningsVisibleCount((current) => {
      const currentCount = current[jobId] ?? DEFAULT_SCREENING_BATCH;
      const total = screenings[jobId]?.length ?? 0;
      if (currentCount >= total) {
        return { ...current, [jobId]: Math.min(DEFAULT_SCREENING_BATCH, total) };
      }
      const nextCount = Math.min(total, currentCount + DEFAULT_SCREENING_BATCH);
      return { ...current, [jobId]: nextCount };
    });
  };

  const handleExportShortlist = () => {
    if (!selectedDetail) return;
    const headers = [
      "Rank",
      "Applicant Name",
      "Overall Score",
      "Skills Score",
      "Experience Score",
      "Education Score",
      "Relevance Score",
      "Strengths",
      "Gaps",
      "Insights",
      "Recommendation",
    ];

    const rows = selectedDetail.results.map((result) => [
      result.rank,
      result.applicantName,
      result.overallScore,
      result.skillsScore,
      result.experienceScore,
      result.educationScore,
      result.relevanceScore,
      result.strengths.join("; "),
      result.gaps.join("; "),
      (result.insights ?? []).join("; "),
      result.recommendation.replace(/\r?\n/g, " "),
    ]);

    const lines = [headers, ...rows]
      .map((columns) =>
        columns
          .map((value) => {
            const text = String(value ?? "");
            if (/[,"\n]/.test(text)) {
              return `"${text.replace(/"/g, '""')}"`;
            }
            return text;
          })
          .join(","),
      )
      .join("\n");

    const fileName = `umurava-shortlist-${selectedDetail.id}.csv`;
    const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleCloseResultModal = () => {
    setSelectedResult(null);
  };

  useEffect(() => {
    setSelectedResult(null);
    setSelectedScreening(null);
  }, [activeJob?.id]);

  useEffect(() => {
    if (!activeJob) {
      setActiveSidebarSection((current) =>
        current === "applicants" || current === "shortlists" ? "jobs" : current,
      );
      return;
    }

    if (activeJobTab === "applicants") {
      setActiveSidebarSection("applicants");
    } else if (activeJobTab === "shortlist") {
      setActiveSidebarSection("shortlists");
    } else {
      setActiveSidebarSection((current) => (current === "workspace" ? current : "jobs"));
    }
  }, [activeJob, activeJobTab]);

  const activeJobScreenings = activeJob ? screenings[activeJob.id] ?? [] : [];

  const selectedDetail = selectedScreening ? screeningDetails[selectedScreening] : undefined;
  const isActiveJobProcessing = activeJob ? processingJobId === activeJob.id : false;

  const clearInsightsState = useCallback(() => {
    setInsightsLoading(false);
    setInsightsError(null);
    setInsightsReport(null);
    setInsightsShortlistId(null);
  }, []);

  useEffect(() => {
    if (!selectedDetail) {
      setInsightsModalOpen(false);
      clearInsightsState();
      return;
    }

    if (insightsShortlistId && insightsShortlistId !== selectedDetail.id) {
      clearInsightsState();
    }
  }, [clearInsightsState, insightsShortlistId, selectedDetail]);

  const fetchInclusionInsights = useCallback(async (detail: ScreeningDetailRecord) => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const response = await fetch("/api/shortlist/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shortlistId: detail.id,
          shortlist: detail.results,
          jobId: detail.jobId,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to calculate inclusion metrics right now.");
      }

      const payload = (await response.json()) as InclusionInsightsReport;
      setInsightsReport(payload);
      setInsightsShortlistId(detail.id);
    } catch (error) {
      console.error("Failed to fetch inclusion insights", error);
      setInsightsError(error instanceof Error ? error.message : "Unexpected error while fetching inclusion metrics.");
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  const handleOpenInclusionInsights = useCallback(() => {
    if (!selectedDetail) return;
    setInsightsModalOpen(true);
    if (insightsShortlistId !== selectedDetail.id || !insightsReport) {
      void fetchInclusionInsights(selectedDetail);
    }
  }, [fetchInclusionInsights, insightsReport, insightsShortlistId, selectedDetail]);

  const handleCloseInclusionInsights = useCallback(() => {
    setInsightsModalOpen(false);
  }, []);

  const handleRetryInclusionInsights = useCallback(() => {
    if (!selectedDetail) return;
    setInsightsError(null);
    void fetchInclusionInsights(selectedDetail);
  }, [fetchInclusionInsights, selectedDetail]);

  const tabItems: Array<{ key: "overview" | "applicants" | "shortlist"; label: string }> = [
    { key: "overview", label: "Job Overview" },
    { key: "applicants", label: "Applicant Pool" },
    { key: "shortlist", label: "AI Shortlist" },
  ];

  const sidebarItems: Array<{ key: SidebarSection; label: string }> = [
    { key: "workspace", label: "Workspace" },
    { key: "jobs", label: "Jobs" },
    { key: "applicants", label: "Applicants" },
    { key: "shortlists", label: "Shortlists" },
  ];

  return (
    <>
      <InclusionInsightsModal
        isOpen={insightsModalOpen}
        onClose={handleCloseInclusionInsights}
        onRetry={handleRetryInclusionInsights}
        report={insightsReport}
        isLoading={insightsLoading}
        error={insightsError}
      />
      {toast ? (
        <div
          className={`fixed right-6 top-6 z-[80] ${glassPanelClass} flex max-w-sm items-start gap-3 px-5 py-4 text-slate-800`}
        >
          <div
            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
              toast.variant === "success"
                ? "bg-[#0F8A5F]"
                : toast.variant === "error"
                ? "bg-[#DC2626]"
                : "bg-[#0B4F8A]"
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-800">{toast.title}</div>
            {toast.description ? <div className="mt-1 text-xs text-slate-600">{toast.description}</div> : null}
          </div>
          <button
            aria-label="Dismiss toast"
            className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:bg-white"
            onClick={dismissToast}
            type="button"
          >
            Close
          </button>
        </div>
      ) : null}

      {selectedResult ? (
        <div
          className="fixed inset-0 z-50 bg-black/50 overflow-y-auto"
          onClick={handleCloseResultModal}
          role="presentation"
        >
          <div className="flex min-h-full items-start justify-center p-4 sm:p-6 lg:p-8">
            <div
              className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl my-8"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                aria-label="Close shortlisted applicant details"
                className="absolute top-4 right-4 rounded-full border border-white/80 bg-white/80 p-2 text-slate-500 transition hover:bg-white hover:text-slate-700"
                onClick={handleCloseResultModal}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-6 sm:p-8">
                <div className="mb-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Candidate spotlight</div>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">{selectedResult.applicantName}</h3>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className={`${glassPanelClass} h-auto p-6`}>
                    <div className="flex items-center justify-center">
                      <OverallScoreGauge score={selectedResult.overallScore} />
                    </div>
                  </div>
                  <div className={`${glassPanelClass} h-auto p-6`}>
                    <div className="space-y-4">
                      {scoreBars.map((bar) => (
                        <div key={bar.label} className="flex items-center gap-4">
                          <span className="min-w-[8rem] shrink-0 text-sm font-semibold text-slate-900">{bar.label}</span>
                          <div className="relative flex-1">
                            <div className="relative h-2 overflow-hidden rounded-full bg-slate-200/40">
                              <div
                                className="absolute inset-y-0 left-0 h-full rounded-full bg-[#1A8C4E] shadow-[0_0_0_1px_rgba(26,140,78,0.25)] transition-[width] duration-300"
                                style={{ width: `${bar.value}%` }}
                              />
                              <div className="absolute inset-0 rounded-full border border-white/30" aria-hidden="true" />
                            </div>
                          </div>
                          <span className="w-12 shrink-0 text-right text-sm font-semibold text-slate-900">{`${Math.round(bar.value)}%`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className={`${glassPanelClass} p-5`}>
                      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Strengths</div>
                      <ul className="mt-3 space-y-2 text-sm text-slate-700">
                        {selectedResult.strengths.map((strength) => (
                          <li key={strength} className="rounded-2xl bg-[#D1FAE5] px-4 py-2 text-[#065F46]">
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={`${glassPanelClass} p-5`}>
                      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Gaps</div>
                      <ul className="mt-3 space-y-2 text-sm text-slate-700">
                        {selectedResult.gaps.map((gap) => (
                          <li key={gap} className="rounded-2xl bg-[#FEE2E2] px-4 py-2 text-[#991B1B]">
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {selectedResult.insights && selectedResult.insights.length > 0 ? (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Quick insights</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedResult.insights.map((insight) => (
                          <span key={insight} className="rounded-full bg-[#E0F2FE] px-3 py-1 text-xs font-medium text-[#0369A1]">
                            {insight}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Recommendation</div>
                    <p className="mt-3 rounded-2xl bg-white/80 px-4 py-3 text-sm leading-6 text-slate-700">{selectedResult.recommendation}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isJobDialogOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#F5F5F7]/85 px-4 py-10 backdrop-blur-xl"
          onClick={closeJobDialog}
          role="presentation"
        >
          <div
            className={`${glassPanelClass} relative flex w-full max-w-3xl max-h-[90vh] flex-col overflow-y-auto p-8 text-slate-800`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              aria-label="Close job dialog"
              className="absolute right-6 top-6 rounded-full border border-white/80 bg-white/80 p-2 text-slate-500 transition hover:bg-white hover:text-slate-700"
              onClick={closeJobDialog}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="pr-12">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                {jobDialogMode === "edit" ? "Edit role" : "Create new role"}
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {jobDialogMode === "edit" ? "Update the hiring profile" : "Define the hiring profile"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {jobDialogMode === "edit"
                  ? "Fine-tune requirements so the AI keeps ranking the right applicants."
                  : "Set the job foundations before importing applicants or running screenings."}
              </p>
            </div>
            <form className="mt-6 space-y-6" noValidate onSubmit={handleSubmitJob}>
              <div className={`${glassPanelClass} flex flex-col gap-4 border border-white/70 bg-white/70 p-5`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Job profile strength</div>
                    <p className="mt-1 text-sm text-slate-600">Complete the essentials to unlock sharper AI matches.</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-600">{profileStrength.percent}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-white/60">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ background: `linear-gradient(90deg, ${brandGreen}, #1AA775)`, width: `${profileStrength.percent}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {profileStrength.checklist.map((item) => (
                    <span
                      key={item.key}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        item.complete ? "bg-[#0F8A5F]/10 text-[#0F8A5F]" : "bg-white/80 text-slate-500"
                      }`}
                    >
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${
                          item.complete ? "bg-[#0F8A5F]" : "border border-white/70"
                        }`}
                      >
                        {item.complete ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                      </span>
                      {item.label}
                    </span>
                  ))}
                </div>
                <p className="text-sm font-medium text-[#0B4F8A]">{profileStrength.nudge}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-600">Job title</span>
                  <input
                    className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0B4F8A] focus:bg-white"
                    placeholder="Senior Backend Engineer"
                    value={values.title}
                    onChange={(event) => setField("title", event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-600">Location</span>
                  <input
                    className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0B4F8A] focus:bg-white"
                    placeholder="Kigali, Rwanda or Remote"
                    value={values.location}
                    onChange={(event) => setField("location", event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-600">Minimum experience (years)</span>
                  <input
                    className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0B4F8A] focus:bg-white"
                    min="0"
                    type="number"
                    value={values.minExperienceYears}
                    onChange={(event) => setField("minExperienceYears", event.target.value)}
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-600">Job description</span>
                  <AIFairnessGuard
                    name="description"
                    placeholder="Describe the responsibilities, expected outcomes, and team context."
                    value={values.description}
                    onChange={(nextValue) => setField("description", nextValue)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-600">Required skills</span>
                  <input
                    className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0B4F8A] focus:bg-white"
                    placeholder="Node.js, TypeScript, MongoDB"
                    value={values.requiredSkills}
                    onChange={(event) => setField("requiredSkills", event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-600">Nice-to-have skills</span>
                  <input
                    className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0B4F8A] focus:bg-white"
                    placeholder="Redis, AWS, CI/CD"
                    value={values.niceToHaveSkills}
                    onChange={(event) => setField("niceToHaveSkills", event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-600">Education level</span>
                  <select
                    className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0B4F8A] focus:bg-white"
                    value={values.educationLevel}
                    onChange={(event) => setField("educationLevel", event.target.value as CreateJobValues["educationLevel"])}
                  >
                    <option value="any">Any</option>
                    <option value="bachelor">Bachelor</option>
                    <option value="master">Master</option>
                    <option value="phd">PhD</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-600">Employment type</span>
                  <select
                    className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0B4F8A] focus:bg-white"
                    value={values.employmentType}
                    onChange={(event) => setField("employmentType", event.target.value as CreateJobValues["employmentType"])}
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-600">Source</span>
                  <select
                    className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0B4F8A] focus:bg-white"
                    value={values.source}
                    onChange={(event) => setField("source", event.target.value as CreateJobValues["source"])}
                  >
                    <option value="umurava">Umurava profiles</option>
                    <option value="external">External applicants</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-600">Status</span>
                  <select
                    className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0B4F8A] focus:bg-white"
                    value={values.status}
                    onChange={(event) => setField("status", event.target.value as CreateJobValues["status"])}
                  >
                    <option value="draft">Draft</option>
                    <option value="open">Open</option>
                    <option value="screening">Screening</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-600">Shortlist size</span>
                  <div className="flex gap-3">
                    {[10, 20].map((size) => (
                      <button
                        key={size}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          values.shortlistSize === size ? "bg-[#0F8A5F] text-white" : "border border-white/80 bg-white/90 text-slate-600"
                        }`}
                        onClick={() => setField("shortlistSize", size as 10 | 20)}
                        type="button"
                      >
                        Top {size}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              {formError ? <div className="rounded-2xl bg-[#FEE2E2] px-4 py-3 text-sm text-[#B91C1C]">{formError}</div> : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                  <button
                    className="rounded-full border border-white/70 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:opacity-60"
                    disabled={isSubmitting}
                    data-intent="draft"
                    type="submit"
                  >
                    {isSubmitting && submitIntent === "draft"
                      ? "Saving draft…"
                      : jobDialogMode === "edit"
                          ? "Save as draft"
                          : "Save draft"}
                  </button>
                  <button
                    className="rounded-full bg-[#0F8A5F] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c6f4d] hover:shadow-md disabled:opacity-70"
                    disabled={isSubmitting}
                    data-intent="publish"
                    type="submit"
                  >
                    {isSubmitting && submitIntent !== "draft"
                      ? jobDialogMode === "edit"
                        ? "Publishing…"
                        : "Creating role…"
                      : jobDialogMode === "edit"
                        ? values.status === "draft"
                          ? "Publish role"
                          : "Save changes"
                        : "Publish role"}
                  </button>
                </div>
                <button
                  className="rounded-full border border-white/80 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white"
                  onClick={resetJobForm}
                  type="button"
                >
                  Reset form
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {pendingDeleteJob ? (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-[#F5F5F7]/80 px-4 backdrop-blur-xl"
          role="presentation"
          onClick={() => {
            if (deletingJobId) return;
            setPendingDeleteJob(null);
          }}
        >
          <div
            className="relative w-full max-w-md rounded-[32px] border border-[#FEE2E2] bg-white/85 p-8 text-slate-700 shadow-[0_30px_80px_rgba(185,28,28,0.15)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              aria-label="Close delete dialog"
              className="absolute right-5 top-5 rounded-full border border-white/70 bg-white/80 p-2 text-slate-400 transition hover:bg-white hover:text-slate-600"
              onClick={() => {
                if (deletingJobId) return;
                setPendingDeleteJob(null);
              }}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-4 pr-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FEF2F2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#B91C1C]">
                Alert
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Archive this role?</h2>
              <p className="text-sm leading-6 text-slate-600">
                {`This will close “${pendingDeleteJob.title}” and remove it from your active list. Screenings stay in history for compliance.`}
              </p>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  className="flex-1 rounded-full bg-[#B91C1C] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#991B1B] disabled:opacity-70"
                  disabled={deletingJobId === pendingDeleteJob.id}
                  onClick={() => handleDeleteJob(pendingDeleteJob)}
                  type="button"
                >
                  {deletingJobId === pendingDeleteJob.id ? "Archiving…" : "Archive role"}
                </button>
                <button
                  className="flex-1 rounded-full border border-white/80 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white"
                  disabled={Boolean(deletingJobId)}
                  onClick={() => setPendingDeleteJob(null)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen bg-[#F5F5F7] text-slate-800">
        <aside className={`hidden lg:flex ${glassPanelClass} m-6 w-64 flex-col justify-between p-6`}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Umurava</div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">AI Screening</h2>
            <p className="mt-2 text-sm text-slate-600">Navigate roles, manage applicants, and unveil AI insights in one flow.</p>
            <nav className="mt-6 space-y-2 text-sm font-medium text-slate-600">
              {sidebarItems.map((item) => {
                const isActive = activeSidebarSection === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSidebarNavigation(item.key)}
                    aria-current={isActive ? "page" : undefined}
                    className={`w-full rounded-2xl px-4 py-2 text-left transition ${
                      isActive
                        ? "bg-white text-slate-800 shadow-sm"
                        : "border border-transparent hover:border-white/60 hover:bg-white/60"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className={`${glassPanelClass} p-4 text-xs text-slate-600`}>
            <div className="font-semibold text-slate-800">Need help?</div>
            <p className="mt-2 leading-5">
              We&apos;re available at <span className="font-semibold text-[#0B4F8A]">competence@umurava.africa</span>.
            </p>
          </div>
        </aside>
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around gap-4 border-t border-white/60 bg-white/90 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 backdrop-blur-xl shadow-[0_-12px_40px_rgba(15,138,95,0.18)] lg:hidden"
          aria-label="Workspace quick navigation"
        >
          {sidebarItems.map((item) => {
            const isActive = activeSidebarSection === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSidebarNavigation(item.key)}
                aria-current={isActive ? "page" : undefined}
                className={`flex-1 rounded-full px-2 py-2 transition ${isActive ? "bg-[#0F8A5F] text-white shadow-md" : "border border-white/70 bg-white/60"}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
          <div id="workspace-root" className="mx-auto flex max-w-6xl flex-col gap-6 pb-28 lg:pb-12">
            <div className={`${glassPanelClass} px-6 py-6`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Recruiter workspace</p>
                  <h1 className="mt-2 pt-20 text-3xl font-semibold text-slate-900 md:pt-0">Jobs & AI Shortlists</h1>
                  <p className="mt-3 max-w-2xl text-sm text-slate-600">
                    Structure each role, ingest applicants, and compare AI-ranked talent with full transparency.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0B4F8A] text-[11px] font-bold text-white">
                      {recruiterName.slice(0, 1).toUpperCase()}
                    </span>
                    <span>Welcome {recruiterName}</span>
                  </div>
                  <button
                    className="rounded-full bg-[#0F8A5F] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
                    onClick={openCreateDialog}
                    type="button"
                  >
                    Create new role
                  </button>
                  <button
                    className="rounded-full border border-white/80 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white"
                    onClick={() => void refreshJobs()}
                    type="button"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {(["all", "draft", "open", "screening", "closed"] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                      statusFilter === filterKey
                        ? "bg-[#0B4F8A] text-white shadow-md"
                        : "border border-white/80 bg-white/60 text-slate-600 hover:bg-white"
                    }`}
                    onClick={() => {
                      setStatusFilter(filterKey);
                      void refreshJobs(filterKey);
                    }}
                    type="button"
                  >
                    {filterKey === "all" ? "All jobs" : filterKey}
                  </button>
                ))}
              </div>
            </div>

            {!isDetailView ? (
              <section id="jobs-section" className={`${glassPanelClass} p-6`} aria-label="Jobs catalog">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">All jobs</div>
                    <p className="mt-1 text-sm text-slate-600">{isRefreshing ? "Refreshing jobs…" : `${filteredJobs.length} roles in view`}</p>
                  </div>
                  <button
                    className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-white"
                    onClick={() => void refreshJobs(statusFilter)}
                    type="button"
                  >
                    Refresh
                  </button>
                </div>
                {filteredJobs.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-white/70 bg-white/75 px-5 py-6 text-sm leading-6 text-slate-600">
                    No jobs yet for this filter. Create your first role to start building the screening pipeline.
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredJobs.map((job) => {
                      const isThisJobScreening = processingJobId === job.id;
                      const isAnyJobScreening = processingJobId !== null;

                      return (
                        <div
                          key={job.id}
                          className={`group cursor-pointer rounded-3xl border px-5 py-5 transition-all focus-within:ring-2 focus-within:ring-[#0B4F8A] focus:outline-none ${
                            activeJobId === job.id
                              ? "border-[#0B4F8A]/40 bg-[#E8F3FC]/70 shadow-lg"
                              : "border-white/80 bg-white/70 hover:border-[#0B4F8A]/30 hover:shadow-md"
                          }`}
                          onClick={() => openJobDetail(job.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openJobDetail(job.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="text-base font-semibold text-slate-900">{job.title}</div>
                                {job.status === "draft" ? (
                                  <span className="rounded-full border border-[#CBD5F5] bg-[#E8ECFF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#4C57B6]">
                                    Draft
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 text-sm text-slate-600">{job.location}</div>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[job.status]}`}>{job.status}</span>
                          </div>
                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{job.description}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {job.requiredSkills.slice(0, 4).map((skill) => (
                              <span key={skill} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                                {skill}
                              </span>
                            ))}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleRunScreening(job.id);
                              }}
                              disabled={isAnyJobScreening}
                              className={`flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-medium transition-all duration-300 ${
                                isThisJobScreening
                                  ? "border border-slate-200 bg-slate-100 text-slate-800 shadow-inner"
                                  : isAnyJobScreening
                                    ? "border border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
                                    : "bg-[#1A8C4E] text-white shadow-md hover:bg-[#157340] hover:shadow-lg"
                              }`}
                              type="button"
                            >
                              {isThisJobScreening ? (
                                <>
                                  <EscaladeLoader />
                                  <span className="text-xs font-semibold leading-tight text-slate-700">
                                    AI is analyzing candidate experience against job requirements
                                  </span>
                                </>
                              ) : (
                                <span>Run Screening</span>
                              )}
                            </button>
                            <button
                              className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0B4F8A] underline-offset-4 hover:underline"
                              onClick={(event) => {
                                event.stopPropagation();
                                void refreshScreenings(job.id);
                                openJobDetail(job.id, "shortlist");
                              }}
                              type="button"
                            >
                              View shortlist
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditDialog(job);
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-800"
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPendingDeleteJob(job);
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-[#FEE2E2] bg-[#FFF5F5] px-3 py-1.5 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : activeJob ? (
              <section id="job-detail-top" className={`${glassPanelClass} p-6`} aria-label="Job detail">
                <div className="flex flex-col gap-4">
                  <button
                    className="flex items-center gap-2 text-sm font-semibold text-[#0B4F8A] transition hover:text-[#093d6e]"
                    onClick={() => {
                      setActiveJobId(null);
                      setActiveJobTab("overview");
                      setSelectedScreening(null);
                      setSelectedResult(null);
                      setActiveSidebarSection("jobs");
                      scrollToSection("jobs-section");
                    }}
                    type="button"
                  >
                    <span aria-hidden="true">←</span>
                    Back to all jobs
                  </button>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Selected role</div>
                      <h2 className="mt-2 text-3xl font-semibold text-slate-900">{activeJob.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{activeJob.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-white"
                        onClick={() => void refreshJobs(statusFilter)}
                        type="button"
                      >
                        Refresh jobs
                      </button>
                      <button
                        className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-white"
                        onClick={() => void refreshScreenings(activeJob.id)}
                        type="button"
                      >
                        Refresh screenings
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-white"
                        onClick={() => openEditDialog(activeJob)}
                        type="button"
                      >
                        <PencilLine className="h-3.5 w-3.5" /> Edit role
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6" role="presentation">
                  <div className="bg-slate-50/50 rounded-[24px] p-1.5 border border-slate-100 flex justify-between" role="tablist">
                    {tabItems.map((tab) => {
                      const isActive = activeJobTab === tab.key;

                      return (
                        <button
                          key={tab.key}
                          className={`relative flex flex-1 items-center justify-center rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
                            isActive
                              ? "text-[#0B4F8A]"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                          onClick={() => {
                            openJobDetail(activeJob.id, tab.key);
                          }}
                          role="tab"
                          aria-selected={isActive}
                          type="button"
                        >
                          <span className="relative z-10">{tab.label}</span>
                          {isActive ? (
                            <span className="absolute inset-x-3 bottom-1 h-1 rounded-full bg-[#0B4F8A]" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6">
                  {activeJobTab === "overview" ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl bg-white/80 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Location</div>
                        <div className="mt-2 text-sm font-medium text-slate-900">{activeJob.location}</div>
                      </div>
                      <div className="rounded-2xl bg-white/80 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Employment type</div>
                        <div className="mt-2 text-sm font-medium text-slate-900">{activeJob.employmentType}</div>
                      </div>
                      <div className="rounded-2xl bg-white/80 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Shortlist size</div>
                        <div className="mt-2 text-sm font-medium text-slate-900">Top {activeJob.shortlistSize}</div>
                      </div>
                      <div className="rounded-2xl bg-white/80 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Minimum experience</div>
                        <div className="mt-2 text-sm font-medium text-slate-900">{activeJob.minExperienceYears}+ years</div>
                      </div>
                      <div className="rounded-2xl bg-white/80 p-4 lg:col-span-2">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Required skills</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {activeJob.requiredSkills.length > 0 ? (
                            activeJob.requiredSkills.map((skill) => (
                              <span key={skill} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-slate-600">No required skills specified yet.</span>
                          )}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/80 p-4 lg:col-span-2">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Nice-to-have skills</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {activeJob.niceToHaveSkills.length > 0 ? (
                            activeJob.niceToHaveSkills.map((skill) => (
                              <span key={skill} className="rounded-full bg-[#0F8A5F]/10 px-3 py-1 text-xs font-semibold text-[#0F8A5F]">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-slate-600">No bonus skills added yet.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : activeJobTab === "applicants" ? (
                    <div id="applicants-section" className="space-y-6">
                      <div className="grid gap-6 lg:grid-cols-2">
                        <form className="rounded-2xl bg-white/80 p-5 shadow-sm" onSubmit={handleCsvImport}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CSV / Excel upload</div>
                              <p className="mt-1 text-sm text-slate-600">Bulk-import candidates mapped to the Umurava schema.</p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">Bulk</span>
                          </div>
                          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-xs text-slate-500 transition hover:border-[#0B4F8A]">
                            <span className="font-semibold uppercase tracking-[0.28em]">Select CSV</span>
                            <input
                              accept=".csv,text/csv"
                              className="hidden"
                              onChange={(event) => {
                                const fileList = event.target.files;
                                setCsvFile(fileList && fileList.length > 0 ? fileList[0] : null);
                              }}
                              type="file"
                            />
                            <span className="mt-3 text-[11px] text-slate-500">{csvFile?.name ?? "No file selected"}</span>
                          </label>
                          <label className="mt-5 block text-xs text-slate-600">
                            <span className="font-semibold uppercase tracking-[0.2em] text-slate-500">Source</span>
                            <select
                              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0B4F8A]"
                              value={csvSource}
                              onChange={(event) => setCsvSource(event.target.value as typeof csvSource)}
                            >
                              <option value="umurava">Umurava profiles</option>
                              <option value="external">External applicants</option>
                            </select>
                          </label>
                          <button
                            className="mt-5 rounded-full bg-[#0B4F8A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#093d6e] disabled:opacity-70"
                            disabled={csvIsUploading}
                            type="submit"
                          >
                            {csvIsUploading ? "Uploading…" : "Upload CSV"}
                          </button>
                          {csvErrors ? (
                            <div className="mt-4 rounded-2xl border border-[#DC2626]/20 bg-[#FEE2E2] px-4 py-3 text-xs text-[#B91C1C]">
                              {csvErrors}
                            </div>
                          ) : null}
                          {csvWarnings.length > 0 ? (
                            <div className="mt-4 overflow-hidden rounded-2xl border border-amber-200/50 bg-amber-50/50 p-4 text-xs text-amber-900 backdrop-blur-md">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold uppercase tracking-[0.2em] text-[10px] text-amber-700">
                                  Warnings ({csvWarnings.length})
                                </div>
                                {csvWarnings.length > 2 ? (
                                  <button
                                    className="text-[11px] font-semibold text-amber-700/80 transition hover:text-amber-800"
                                    onClick={() => setCsvWarningsExpanded((value) => !value)}
                                    type="button"
                                  >
                                    {csvWarningsExpanded
                                      ? "Show fewer details"
                                      : `+${csvWarnings.length - 2} more details`}
                                  </button>
                                ) : null}
                              </div>
                              <ul className="mt-2 space-y-1">
                                {(csvWarningsExpanded ? csvWarnings : csvWarnings.slice(0, 2)).map((warning) => (
                                  <li key={`${warning.row}-${warning.message}`}>
                                    {warning.row > 0 ? `Row ${warning.row}: ` : ""}
                                    {warning.message}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {csvSummary ? (
                            <div className="mt-4 rounded-2xl border border-emerald-200/50 bg-emerald-50/50 px-4 py-3 text-xs text-emerald-900">
                              <div className="font-semibold uppercase tracking-[0.2em] text-[10px] text-emerald-700">Last import</div>
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 aria-hidden className="h-4 w-4 text-emerald-500" />
                                  <span className="font-semibold text-emerald-800">Import succeeded</span>
                                </div>
                                <div>
                                  Processed: <span className="font-semibold">{csvSummary.totalProcessed}</span>
                                </div>
                                <div>
                                  Inserted: <span className="font-semibold">{csvSummary.inserted}</span> · Updated: <span className="font-semibold">{Math.max(csvSummary.updated, 0)}</span>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </form>

                        <form className="rounded-2xl bg-white/80 p-5 shadow-sm" onSubmit={handlePdfImport}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">PDF resume upload</div>
                              <p className="mt-1 text-sm text-slate-600">Bring in a single applicant from a PDF resume.</p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">Single</span>
                          </div>
                          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-xs text-slate-500 transition hover:border-[#0B4F8A]">
                            <span className="font-semibold uppercase tracking-[0.28em]">Select PDF</span>
                            <input
                              accept=".pdf"
                              className="hidden"
                              onChange={(event) => {
                                const fileList = event.target.files;
                                setPdfFile(fileList && fileList.length > 0 ? fileList[0] : null);
                              }}
                              type="file"
                            />
                            <span className="mt-3 text-[11px] text-slate-500">{pdfFile?.name ?? "No file selected"}</span>
                          </label>
                          <button
                            className="mt-5 rounded-full bg-[#0B4F8A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#093d6e] disabled:opacity-70"
                            disabled={pdfIsUploading}
                            type="submit"
                          >
                            {pdfIsUploading ? "Uploading…" : "Upload PDF"}
                          </button>
                          {pdfError ? (
                            <div className="mt-4 rounded-2xl border border-[#DC2626]/20 bg-[#FEE2E2] px-4 py-3 text-xs text-[#B91C1C]">
                              {pdfError}
                            </div>
                          ) : null}
                          {pdfSummary ? (
                            <div className="mt-4 rounded-2xl border border-[#0F8A5F]/30 bg-[#D1FAE5] px-4 py-3 text-xs text-[#065F46]">
                              <div className="font-semibold uppercase tracking-[0.2em] text-[10px]">Last upload</div>
                              <div className="mt-2 grid gap-1">
                                <div>Applicant: <span className="font-semibold">{pdfSummary.applicant.firstName} {pdfSummary.applicant.lastName}</span></div>
                                {pdfSummary.aiModelVersion ? (
                                  <div>AI model: <span className="font-semibold">{pdfSummary.aiModelVersion}</span></div>
                                ) : null}
                                <div>Upserted: <span className="font-semibold">{pdfSummary.upserted}</span> · Updated: <span className="font-semibold">{pdfSummary.updated}</span></div>
                              </div>
                            </div>
                          ) : null}
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div id="screenings-section" className="space-y-6">
                      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                        <div className="space-y-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Screening history</div>
                          {screeningsLoading[activeJob.id] ? (
                            <div className="rounded-2xl bg-white/80 px-4 py-4 text-xs text-slate-600">Fetching screening runs…</div>
                          ) : screeningsError[activeJob.id] ? (
                            <div className="rounded-2xl border border-[#DC2626]/20 bg-[#FEE2E2] px-4 py-4 text-xs text-[#B91C1C]">
                              {screeningsError[activeJob.id]}
                            </div>
                          ) : activeJobScreenings.length === 0 ? (
                            <div className="rounded-2xl bg-white/80 px-4 py-4 text-xs text-slate-600">Run a screening to build shortlist history for this role.</div>
                          ) : (
                            <div className="space-y-3">
                              {activeJobScreenings
                                .slice(0, screeningsVisibleCount[activeJob.id] ?? DEFAULT_SCREENING_BATCH)
                                .map((record) => {
                                  const isActive = selectedScreening === record.id;
                                  const createdDate = new Date(record.createdAt);
                                  const timestamp = Number.isNaN(createdDate.getTime())
                                    ? "Unknown timestamp"
                                    : screeningDateFormatter.format(createdDate);
                                  const processingLabel = formatProcessingDuration(record.processingTimeMs);

                                  return (
                                    <button
                                      key={record.id}
                                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                        isActive
                                          ? "border-[#0F8A5F]/50 bg-[#0F8A5F]/10 shadow-[0_12px_40px_rgba(15,138,95,0.18)]"
                                          : "border-white/80 bg-white/80 hover:border-[#0F8A5F]/40 hover:shadow-sm"
                                      }`}
                                      onClick={() => {
                                        void loadScreeningDetail(record.id, activeJob.id);
                                      }}
                                      type="button"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                          <div className="text-sm font-semibold text-slate-900">{timestamp}</div>
                                          <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-600">
                                            {record.status === "completed"
                                              ? `Shortlist of Top ${record.shortlistSize}`
                                              : `Status: ${record.status}`}
                                          </div>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${screeningStatusTone[record.status]}`}>
                                          {record.status}
                                        </span>
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                                        <span>Applicants {record.totalApplicants}</span>
                                        {processingLabel ? <span>Processing {processingLabel}</span> : null}
                                        {record.aiModelVersion ? <span>Model {record.aiModelVersion}</span> : null}
                                      </div>
                                      {record.error ? (
                                        <div className="mt-2 text-xs text-[#B91C1C]">Error: {record.error}</div>
                                      ) : null}
                                    </button>
                                  );
                                })}
                              {screeningsVisibleCount[activeJob.id] &&
                              (screeningsVisibleCount[activeJob.id] ?? 0) < activeJobScreenings.length ? (
                                <button
                                  className="w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-white"
                                  onClick={() => handleShowMoreScreenings(activeJob.id)}
                                  type="button"
                                >
                                  Load more screenings
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Shortlist detail</div>
                            {selectedDetail && selectedDetail.results.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
                                  onClick={handleOpenInclusionInsights}
                                  type="button"
                                >
                                  <span aria-hidden="true" role="img">
                                    ✨
                                  </span>
                                  Inclusion Insights
                                </button>
                                <button
                                  className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-white"
                                  onClick={handleExportShortlist}
                                  type="button"
                                >
                                  Export CSV
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div className="space-y-3">
                            {isLoadingScreeningDetail ? (
                              <p className="text-xs text-slate-600">Loading shortlist…</p>
                            ) : screeningDetailError ? (
                              <div className="rounded-2xl border border-[#DC2626]/20 bg-[#FEE2E2] px-4 py-4 text-xs text-[#B91C1C]">
                                {screeningDetailError}
                              </div>
                            ) : isActiveJobProcessing ? (
                              <div className={`${glassPanelClass} flex items-center gap-3 px-5 py-4 text-sm text-slate-600`}>
                                <EscaladeLoader />
                                <span>AI is analyzing candidate experience against job requirements</span>
                              </div>
                            ) : !isMounted ? (
                              <p className="text-xs text-slate-600">Preparing shortlist preview…</p>
                            ) : selectedDetail ? (
                              selectedDetail.results.length > 0 ? (
                                selectedDetail.results.map((result) => (
                                  <div
                                    key={result.applicantId}
                                    className={`${glassPanelClass} px-5 py-4 transition-all hover:-translate-y-1 hover:shadow-md`}
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <div className="text-sm font-semibold text-slate-900">#{result.rank} · {result.applicantName}</div>
                                        <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-600">
                                          Overall <span className="font-semibold text-[#0F8A5F]">{result.overallScore}</span> • Skills {result.skillsScore} • Experience {result.experienceScore} • Education {result.educationScore}
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {result.isShortlisted ? (
                                          <span className="rounded-full bg-[#0F8A5F]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#0F8A5F]">
                                            Shortlisted
                                          </span>
                                        ) : null}
                                        <button
                                          className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-white"
                                          onClick={() => setSelectedResult(result)}
                                          type="button"
                                        >
                                          Inspect
                                        </button>
                                      </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                                      {result.strengths.slice(0, 3).map((strength) => (
                                        <span key={strength} className="rounded-full bg-[#D1FAE5] px-3 py-1 text-xs font-semibold text-[#065F46]">
                                          {strength}
                                        </span>
                                      ))}
                                      {result.insights && result.insights.length > 0 ? (
                                        <span className="rounded-full bg-[#E0F2FE] px-3 py-1 text-xs font-semibold text-[#0369A1]">
                                          {result.insights[0]}
                                          {result.insights.length > 1 ? " +" : ""}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="mt-3 rounded-2xl bg-white/70 px-4 py-3 text-xs leading-6 text-slate-600">
                                      {result.recommendation}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-600">No candidates returned for this screening.</p>
                              )
                            ) : activeJobScreenings.length === 0 ? (
                              <p className="text-xs text-slate-600">Run a screening to generate shortlist insights for this role.</p>
                            ) : (
                              <p className="text-xs text-slate-600">Select a screening run to view ranked applicants.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </div>
    </>
  );
}
