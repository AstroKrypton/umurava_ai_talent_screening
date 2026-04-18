import Link from "next/link";

export default function GetStartedPage() {
  return (
    <main className="min-h-screen bg-[#F5F5F7] text-[#1C1C2E]">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(11,79,138,0.16),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(26,140,78,0.14),_transparent_32%),linear-gradient(180deg,_#F8FBFF_0%,_#F5F5F7_55%,_#EEF6F1_100%)]" />
        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 md:px-10">
          <div className="mb-10 flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0B4F8A] text-sm font-bold text-white">
                U
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1C1C2E]">Umurava AI</div>
                <div className="text-xs text-slate-500">Talent Screening Platform</div>
              </div>
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-[#1C1C2E]/10 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#1C1C2E]"
            >
              Sign in
            </Link>
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#E8F3FC] px-4 py-1.5 text-xs font-semibold text-[#0B4F8A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0B4F8A]" />
                Recruiting begins here
              </div>
              <h1 className="max-w-xl text-5xl font-bold tracking-tight text-[#1C1C2E] md:text-6xl">
                Start building a faster, more transparent hiring workflow.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Create your workspace, define open roles, add candidate profiles,
                and let Umurava AI surface the strongest matches with clear reasoning
                your team can trust.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <Link
                  href="/register"
                  className="rounded-[1.75rem] border border-[#0B4F8A]/10 bg-white/85 p-6 shadow-[0_20px_60px_rgba(11,79,138,0.08)] transition-transform hover:-translate-y-0.5"
                >
                  <div className="mb-4 inline-flex rounded-full bg-[#E8F3FC] px-3 py-1 text-xs font-semibold text-[#0B4F8A]">
                    New account
                  </div>
                  <h2 className="text-xl font-semibold text-[#1C1C2E]">Create workspace</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Set up your recruiter account and get ready to manage roles,
                    applicants, and AI-driven shortlists.
                  </p>
                  <div className="mt-5 text-sm font-medium text-[#0B4F8A]">Create account</div>
                </Link>

                <Link
                  href="/login"
                  className="rounded-[1.75rem] border border-[#1A8C4E]/10 bg-white/85 p-6 shadow-[0_20px_60px_rgba(26,140,78,0.08)] transition-transform hover:-translate-y-0.5"
                >
                  <div className="mb-4 inline-flex rounded-full bg-[#E6F6EE] px-3 py-1 text-xs font-semibold text-[#1A8C4E]">
                    Existing workspace
                  </div>
                  <h2 className="text-xl font-semibold text-[#1C1C2E]">Sign in</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Access your jobs, imported applicants, screening history,
                    and ranked candidate shortlists.
                  </p>
                  <div className="mt-5 text-sm font-medium text-[#1A8C4E]">Open workspace</div>
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/70 p-7 shadow-[0_30px_80px_rgba(28,28,46,0.08)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#1C1C2E]">What you can do</div>
                  <div className="text-xs text-slate-400">Designed for structured hiring teams</div>
                </div>
                <div className="rounded-full bg-[#FEF8E1] px-3 py-1 text-xs font-semibold text-[#7A5C00]">
                  Recruiter workspace
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  {
                    title: "Define each role clearly",
                    body: "Capture hiring requirements, must-have skills, preferred experience, and shortlist size before screening begins.",
                  },
                  {
                    title: "Bring candidates into one pipeline",
                    body: "Work with Umurava profiles and external applicants in the same structured workflow for easier comparison.",
                  },
                  {
                    title: "Review explainable AI rankings",
                    body: "See why a candidate was ranked highly, where gaps exist, and where your team should focus interviews.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate-100 bg-white/80 px-5 py-5"
                  >
                    <div className="text-sm font-semibold text-[#1C1C2E]">{item.title}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-[#E8F3FC] p-5">
                <div className="text-sm font-semibold text-[#0B4F8A]">Built for clarity</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Umurava AI helps recruiters move faster while keeping final hiring
                  decisions with people, not automation alone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
