"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setAuthError, setAuthPending, setAuthUser } from "@/store/slices/authSlice";

type LoginValues = {
  email: string;
  password: string;
};

type LoginErrors = Partial<Record<keyof LoginValues, string>>;

function validateLogin(values: LoginValues) {
  const errors: LoginErrors = {};

  if (!values.email.trim()) errors.email = "Email address is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Enter a valid email address.";
  if (!values.password) errors.password = "Password is required.";

  return errors;
}

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [values, setValues] = useState<LoginValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof LoginValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    dispatch(setAuthPending());
    setFormError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        setFormError(result.error || "Unable to sign in.");
        dispatch(setAuthError(result.error || "Unable to sign in."));
        return;
      }

      if (result.data) {
        dispatch(setAuthUser(result.data));
      }

      router.push("/workspace");
      router.refresh();
    } catch {
      setFormError("Something went wrong while signing in.");
      dispatch(setAuthError("Something went wrong while signing in."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#F8FBFF_0%,_#F5F5F7_55%,_#EEF6F1_100%)] px-6 py-16 text-[#1C1C2E] md:px-10">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="rounded-[2rem] border border-white/70 bg-[#1C1C2E] p-8 text-white shadow-[0_30px_80px_rgba(28,28,46,0.16)]">
          <div className="text-sm font-semibold text-[#F5C518]">Welcome back</div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Continue your hiring workflow</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Sign in to manage open roles, review applicants, and access AI-powered
            screening results in your workspace.
          </p>

          <div className="mt-8 space-y-4">
            {[
              "Review active jobs and screening status",
              "Track imported candidates in one place",
              "Compare ranked shortlists with clear reasoning",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </aside>

        <section className="rounded-[2rem] border border-white/70 bg-white/75 p-8 shadow-[0_30px_80px_rgba(28,28,46,0.08)] backdrop-blur-xl md:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[#0B4F8A]">Secure access</div>
              <h2 className="mt-2 text-4xl font-bold tracking-tight">Sign in to Umurava AI</h2>
            </div>
            <Link
              href="/register"
              className="rounded-full border border-[#1C1C2E]/10 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#1C1C2E]"
            >
              Create account
            </Link>
          </div>

          <form className="mt-8" noValidate onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-600">Email address</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0B4F8A]"
                  placeholder="name@company.com"
                  type="email"
                  value={values.email}
                  onChange={(event) => updateField("email", event.target.value)}
                />
                {errors.email ? <p className="text-xs text-[#C8401E]">{errors.email}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="flex items-center justify-between gap-4 text-sm font-medium text-slate-600">
                  <span>Password</span>
                  <button className="text-xs font-semibold text-[#0B4F8A]" type="button">
                    Forgot password?
                  </button>
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0B4F8A]"
                  placeholder="Enter password"
                  type="password"
                  value={values.password}
                  onChange={(event) => updateField("password", event.target.value)}
                />
                {errors.password ? <p className="text-xs text-[#C8401E]">{errors.password}</p> : null}
              </label>
            </div>

            {formError ? <div className="mt-5 rounded-2xl bg-[#FAF0ED] px-4 py-3 text-sm text-[#C8401E]">{formError}</div> : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="rounded-full bg-[#1A8C4E] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#146c3c] disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
              <Link
                href="/get-started"
                className="rounded-full border border-[#1C1C2E]/10 bg-white px-6 py-3 text-sm font-medium text-slate-600 transition-colors hover:text-[#1C1C2E]"
              >
                Back
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
