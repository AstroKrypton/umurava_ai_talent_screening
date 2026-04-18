"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const EMPLOYMENT_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
] as const;

const EDUCATION_OPTIONS = [
  { value: "any", label: "Any level" },
  { value: "bachelor", label: "Bachelor's" },
  { value: "master", label: "Master's" },
  { value: "phd", label: "PhD" },
] as const;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
] as const;

const SOURCE_OPTIONS = [
  { value: "umurava", label: "Umurava" },
  { value: "external", label: "External" },
] as const;

const STEPS = [
  { key: "basics", label: "Basics" },
  { key: "requirements", label: "Requirements" },
  { key: "screening", label: "Screening" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

type FormState = {
  title: string;
  description: string;
  location: string;
  employmentType: (typeof EMPLOYMENT_OPTIONS)[number]["value"];
  requiredSkills: string;
  niceToHaveSkills: string;
  minExperienceYears: number;
  educationLevel: (typeof EDUCATION_OPTIONS)[number]["value"];
  shortlistSize: 10 | 20;
  status: (typeof STATUS_OPTIONS)[number]["value"];
  source: (typeof SOURCE_OPTIONS)[number]["value"];
};

type CreateJobFlowProps = {
  recruiterName: string;
};

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function normalizeSkills(input: string) {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function CreateJobFlow({ recruiterName }: CreateJobFlowProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    location: "Kigali, Rwanda",
    employmentType: "full-time",
    requiredSkills: "Node.js, TypeScript, MongoDB",
    niceToHaveSkills: "AI, Figma, Cloud Architecture",
    minExperienceYears: 2,
    educationLevel: "any",
    shortlistSize: 10,
    status: "draft",
    source: "umurava",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const activeStep = STEPS[stepIndex];

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(step: StepKey) {
    const nextErrors: Record<string, string> = {};

    if (step === "basics") {
      if (!form.title.trim()) nextErrors.title = "Title is required";
      if (!form.description.trim()) nextErrors.description = "Description is required";
      if (!form.location.trim()) nextErrors.location = "Location is required";
    }

    if (step === "requirements") {
      if (!form.requiredSkills.trim()) nextErrors.requiredSkills = "Add at least one required skill";
      if (form.minExperienceYears < 0) nextErrors.minExperienceYears = "Experience must be 0 or higher";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    if (!validateStep(activeStep.key)) return;
    setErrors({});
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
    setServerError(null);
  }

  function handlePrev() {
    setErrors({});
    setServerError(null);
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }

  const progress = useMemo(() => ((stepIndex + 1) / STEPS.length) * 100, [stepIndex]);

  function handleSubmit() {
    if (!validateStep(activeStep.key)) return;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      employmentType: form.employmentType,
      requiredSkills: normalizeSkills(form.requiredSkills),
      niceToHaveSkills: normalizeSkills(form.niceToHaveSkills),
      minExperienceYears: form.minExperienceYears,
      educationLevel: form.educationLevel,
      shortlistSize: form.shortlistSize,
      status: form.status,
      source: form.source,
    };

    setServerError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = (await response.json()) as {
          success?: boolean;
          data?: { id: string };
          error?: string;
        };

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error || "Failed to create job");
        }

        router.push(`/jobs/${result.data.id}`);
        router.refresh();
      } catch (error) {
        setServerError(error instanceof Error ? error.message : "Unexpected error");
      }
    });
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,_#F1F6FF_0%,_#F5F5F7_45%,_#EEF6F1_100%)] pb-20">
      <div className="mx-auto max-w-4xl px-6 pt-12 md:px-10">
        <header className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/70 p-9 text-[var(--color-rwanda-night)] shadow-[0_40px_98px_rgba(12,26,35,0.12)] backdrop-blur-xl">
          <div className="pointer-events-none absolute -top-32 right-10 h-60 w-60 rounded-full bg-[radial-gradient(circle_at_top,_rgba(11,79,138,0.2),_rgba(11,79,138,0))]" />
          <div className="pointer-events-none absolute -bottom-36 left-6 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(26,140,78,0.18),_rgba(26,140,78,0))]" />
          <div className="relative z-[1] flex flex-col gap-6">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 self-start rounded-full border border-white/70 bg-white/70 px-4 py-1 text-xs font-semibold text-slate-500 shadow-sm hover:text-[var(--color-rwanda-sky)]"
            >
              ← Back to all jobs
            </Link>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-rwanda-night)] md:text-4xl">
                Create a new role
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Guided multi-step flow that keeps the Rwanda aesthetic intact. Let’s build a role your AI
                co-pilot can screen effortlessly, {recruiterName.split(" ")[0]}.
              </p>
            </div>
            <div className="relative mt-4 h-2 w-full overflow-hidden rounded-full bg-white/50">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-[linear-gradient(90deg,_#0B4F8A,_#1A8C4E)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              {STEPS.map((step, index) => (
                <span
                  key={step.key}
                  className={classNames(
                    "inline-flex items-center gap-2",
                    index === stepIndex ? "text-[var(--color-rwanda-sky)]" : "opacity-60",
                  )}
                >
                  <span
                    className={classNames(
                      "flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-white/70 text-xs",
                      index <= stepIndex
                        ? "text-[var(--color-rwanda-sky)]"
                        : "text-[var(--color-rwanda-night)]/60",
                    )}
                  >
                    {index + 1}
                  </span>
                  {step.label}
                </span>
              ))}
            </div>
          </div>
        </header>

        <section className="mt-10 rounded-[32px] border border-white/70 bg-white/75 p-8 text-[var(--color-rwanda-night)] shadow-[0_28px_70px_rgba(12,26,35,0.1)] backdrop-blur">
          {activeStep.key === "basics" ? (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Role title</label>
                <input
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="Senior Backend Engineer"
                  className={classNames(
                    "mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-base shadow-inner",
                    errors.title ? "ring-2 ring-[var(--color-rwanda-imigongo)]" : undefined,
                  )}
                />
                {errors.title ? <p className="mt-1 text-xs text-[var(--color-rwanda-imigongo)]">{errors.title}</p> : null}
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Role mission</label>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Describe the impact this role will have."
                  rows={6}
                  className={classNames(
                    "mt-2 w-full rounded-3xl border border-white/70 bg-white/80 px-4 py-4 text-base leading-6 shadow-inner",
                    errors.description ? "ring-2 ring-[var(--color-rwanda-imigongo)]" : undefined,
                  )}
                />
                {errors.description ? (
                  <p className="mt-1 text-xs text-[var(--color-rwanda-imigongo)]">{errors.description}</p>
                ) : null}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Primary location</label>
                  <input
                    value={form.location}
                    onChange={(event) => updateField("location", event.target.value)}
                    placeholder="Kigali, Rwanda"
                    className={classNames(
                      "mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-base shadow-inner",
                      errors.location ? "ring-2 ring-[var(--color-rwanda-imigongo)]" : undefined,
                    )}
                  />
                  {errors.location ? (
                    <p className="mt-1 text-xs text-[var(--color-rwanda-imigongo)]">{errors.location}</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Employment type</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {EMPLOYMENT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField("employmentType", option.value)}
                        className={classNames(
                          "rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-sm font-semibold",
                          form.employmentType === option.value
                            ? "shadow-[0_14px_36px_rgba(11,79,138,0.18)] text-[var(--color-rwanda-sky)]"
                            : "text-slate-500 hover:text-[var(--color-rwanda-sky)]",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeStep.key === "requirements" ? (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Must-have skills</label>
                <textarea
                  value={form.requiredSkills}
                  onChange={(event) => updateField("requiredSkills", event.target.value)}
                  placeholder="Separated by commas: Node.js, TypeScript, MongoDB"
                  rows={4}
                  className={classNames(
                    "mt-2 w-full rounded-3xl border border-white/70 bg-white/80 px-4 py-4 text-base leading-6 shadow-inner",
                    errors.requiredSkills ? "ring-2 ring-[var(--color-rwanda-imigongo)]" : undefined,
                  )}
                />
                {errors.requiredSkills ? (
                  <p className="mt-1 text-xs text-[var(--color-rwanda-imigongo)]">{errors.requiredSkills}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {normalizeSkills(form.requiredSkills).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-[var(--color-rwanda-sky)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-rwanda-sky)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Nice to haves</label>
                <textarea
                  value={form.niceToHaveSkills}
                  onChange={(event) => updateField("niceToHaveSkills", event.target.value)}
                  placeholder="Optional skills separated by commas"
                  rows={4}
                  className="mt-2 w-full rounded-3xl border border-white/70 bg-white/80 px-4 py-4 text-base leading-6 shadow-inner"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {normalizeSkills(form.niceToHaveSkills).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-[var(--color-rwanda-hills)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-rwanda-hills)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Minimum experience (years)
                  </label>
                  <input
                    value={form.minExperienceYears}
                    type="number"
                    min={0}
                    onChange={(event) => updateField("minExperienceYears", Number(event.target.value) || 0)}
                    className={classNames(
                      "mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-base shadow-inner",
                      errors.minExperienceYears ? "ring-2 ring-[var(--color-rwanda-imigongo)]" : undefined,
                    )}
                  />
                  {errors.minExperienceYears ? (
                    <p className="mt-1 text-xs text-[var(--color-rwanda-imigongo)]">{errors.minExperienceYears}</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Education</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {EDUCATION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField("educationLevel", option.value)}
                        className={classNames(
                          "rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-sm font-semibold",
                          form.educationLevel === option.value
                            ? "shadow-[0_14px_36px_rgba(26,140,78,0.18)] text-[var(--color-rwanda-hills)]"
                            : "text-slate-500 hover:text-[var(--color-rwanda-hills)]",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeStep.key === "screening" ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Shortlist size
                  </label>
                  <div className="mt-2 flex gap-2">
                    {[10, 20].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => updateField("shortlistSize", size as 10 | 20)}
                        className={classNames(
                          "flex-1 rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-sm font-semibold",
                          form.shortlistSize === size
                            ? "shadow-[0_14px_36px_rgba(245,197,24,0.22)] text-[var(--color-rwanda-gold-text)]"
                            : "text-slate-500 hover:text-[var(--color-rwanda-gold-text)]",
                        )}
                      >
                        Top {size}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Status</label>
                  <div className="mt-2 flex gap-2">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField("status", option.value)}
                        className={classNames(
                          "flex-1 rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-sm font-semibold",
                          form.status === option.value
                            ? option.value === "open"
                              ? "shadow-[0_14px_36px_rgba(11,79,138,0.2)] text-[var(--color-rwanda-sky)]"
                              : "shadow-[0_14px_36px_rgba(28,28,46,0.16)] text-[var(--color-rwanda-night)]"
                            : "text-slate-500 hover:text-[var(--color-rwanda-sky)]",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Source</label>
                <div className="mt-2 flex gap-2">
                  {SOURCE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("source", option.value)}
                      className={classNames(
                        "flex-1 rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-sm font-semibold",
                        form.source === option.value
                          ? option.value === "umurava"
                            ? "shadow-[0_14px_36px_rgba(26,140,78,0.2)] text-[var(--color-rwanda-hills)]"
                            : "shadow-[0_14px_36px_rgba(200,64,30,0.25)] text-[var(--color-rwanda-imigongo)]"
                          : "text-slate-500 hover:text-[var(--color-rwanda-hills)]",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-dashed border-[var(--color-rwanda-sky)]/30 bg-white/70 p-6 text-sm text-slate-600">
                <h3 className="text-base font-semibold text-[var(--color-rwanda-night)]">
                  Screening readiness checklist
                </h3>
                <ul className="mt-3 space-y-2">
                  <li>✓ At least two applicants before running AI screening.</li>
                  <li>✓ Required skills align with Umurava schema chip colours.</li>
                  <li>✓ Rwanda aesthetic stays consistent across all status badges.</li>
                </ul>
              </div>
            </div>
          ) : null}

          {serverError ? (
            <div className="mt-6 rounded-2xl border border-[var(--color-rwanda-imigongo)]/40 bg-[var(--color-rwanda-imigongo)]/10 px-4 py-3 text-sm text-[var(--color-rwanda-imigongo)]">
              {serverError}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 md:flex-row md:justify-between">
            <button
              type="button"
              onClick={handlePrev}
              disabled={stepIndex === 0 || isPending}
              className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/60 px-6 py-3 text-sm font-semibold text-slate-600 disabled:opacity-40"
            >
              Back
            </button>
            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-full border border-[var(--color-rwanda-sky)] bg-[var(--color-rwanda-sky)] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_44px_rgba(11,79,138,0.32)] disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-full border border-[var(--color-rwanda-hills)] bg-[var(--color-rwanda-hills)] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_44px_rgba(26,140,78,0.28)] disabled:opacity-40"
              >
                {isPending ? "Creating..." : "Launch role"}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default CreateJobFlow;
