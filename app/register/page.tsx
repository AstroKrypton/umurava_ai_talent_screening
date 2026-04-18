"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setAuthError, setAuthPending, setAuthUser } from "@/store/slices/authSlice";

type RegisterValues = {
  name: string;
  organisation: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterErrors = Partial<Record<keyof RegisterValues, string>>;

const initialValues: RegisterValues = {
  name: "",
  organisation: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function validateRegister(values: RegisterValues) {
  const errors: RegisterErrors = {};

  if (!values.name.trim()) errors.name = "Full name is required.";
  if (!values.organisation.trim()) errors.organisation = "Organisation is required.";
  if (!values.email.trim()) errors.email = "Work email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Enter a valid email address.";
  if (!values.password) errors.password = "Password is required.";
  else if (values.password.length < 8) errors.password = "Use at least 8 characters.";
  if (!values.confirmPassword) errors.confirmPassword = "Please confirm your password.";
  else if (values.password !== values.confirmPassword) errors.confirmPassword = "Passwords do not match.";

  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = useMemo(() => {
    const score = Number(values.password.length >= 8) + Number(/[A-Z]/.test(values.password)) + Number(/[0-9]/.test(values.password));
    if (!values.password) return { label: "Not set", color: "bg-slate-200" };
    if (score <= 1) return { label: "Weak", color: "bg-[#C8401E]" };
    if (score === 2) return { label: "Good", color: "bg-[#F5C518]" };
    return { label: "Strong", color: "bg-[#1A8C4E]" };
  }, [values.password]);

  function updateField(field: keyof RegisterValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateRegister(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    dispatch(setAuthPending());
    setFormError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          organisation: values.organisation.trim(),
          email: values.email.trim(),
          password: values.password,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        data?: {
          id: string;
          name: string;
          organisation: string;
          email: string;
          role: string;
        };
      };

      if (!response.ok || !result.success) {
        setFormError(result.error || "Unable to create account.");
        dispatch(setAuthError(result.error || "Unable to create account."));
        return;
      }

      if (result.data) {
        dispatch(setAuthUser(result.data));
      }

      router.push("/workspace");
      router.refresh();
    } catch {
      setFormError("Something went wrong while creating your account.");
      dispatch(setAuthError("Something went wrong while creating your account."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#F5F9FD_0%,_#F5F5F7_50%,_#EDF7F1_100%)] px-6 py-16 text-[#1C1C2E] md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row">
        <section className="flex-1 rounded-[2rem] border border-white/70 bg-white/75 p-8 shadow-[0_30px_80px_rgba(28,28,46,0.08)] backdrop-blur-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#E8F3FC] px-4 py-1.5 text-xs font-semibold text-[#0B4F8A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0B4F8A]" />
            Create recruiter account
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Open your hiring workspace</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Set up your account to manage open roles, review applicants, and run
            explainable AI screening from one place.
          </p>

          <form className="mt-8" noValidate onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-600">Full name</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0B4F8A]"
                  placeholder="Jane Recruiter"
                  value={values.name}
                  onChange={(event) => updateField("name", event.target.value)}
                />
                {errors.name ? <p className="text-xs text-[#C8401E]">{errors.name}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-600">Organisation</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0B4F8A]"
                  placeholder="Umurava Talent"
                  value={values.organisation}
                  onChange={(event) => updateField("organisation", event.target.value)}
                />
                {errors.organisation ? <p className="text-xs text-[#C8401E]">{errors.organisation}</p> : null}
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-600">Work email</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0B4F8A]"
                  placeholder="jane@company.com"
                  type="email"
                  value={values.email}
                  onChange={(event) => updateField("email", event.target.value)}
                />
                {errors.email ? <p className="text-xs text-[#C8401E]">{errors.email}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-600">Password</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0B4F8A]"
                  placeholder="Create a secure password"
                  type="password"
                  value={values.password}
                  onChange={(event) => updateField("password", event.target.value)}
                />
                {errors.password ? <p className="text-xs text-[#C8401E]">{errors.password}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-600">Confirm password</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0B4F8A]"
                  placeholder="Repeat password"
                  type="password"
                  value={values.confirmPassword}
                  onChange={(event) => updateField("confirmPassword", event.target.value)}
                />
                {errors.confirmPassword ? <p className="text-xs text-[#C8401E]">{errors.confirmPassword}</p> : null}
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-slate-600">Password strength</span>
                <span className="text-sm font-semibold text-[#1C1C2E]">{passwordStrength.label}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-2 rounded-full ${passwordStrength.color}`} style={{ width: `${values.password ? Math.max((values.password.length / 12) * 100, 25) : 0}%` }} />
              </div>
            </div>

            {formError ? <div className="mt-5 rounded-2xl bg-[#FAF0ED] px-4 py-3 text-sm text-[#C8401E]">{formError}</div> : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="rounded-full bg-[#0B4F8A] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#093d6e] disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
              <Link
                href="/login"
                className="rounded-full border border-[#1C1C2E]/10 bg-white px-6 py-3 text-sm font-medium text-slate-600 transition-colors hover:text-[#1C1C2E]"
              >
                Sign in instead
              </Link>
            </div>
          </form>
        </section>

        <aside className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-[#1C1C2E] p-8 text-white shadow-[0_30px_80px_rgba(28,28,46,0.16)]">
          <div className="text-sm font-semibold text-[#F5C518]">Included in your workspace</div>
          <div className="mt-6 space-y-4">
            {[
              {
                title: "Structured role setup",
                body: "Define hiring requirements, shortlist size, and preferred skills before you screen candidates.",
              },
              {
                title: "Unified applicant pipeline",
                body: "Work across Umurava talent profiles and external applicants inside one consistent screening flow.",
              },
              {
                title: "Explainable shortlists",
                body: "See ranked candidates with strengths, gaps, and role-fit reasoning your team can review together.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
