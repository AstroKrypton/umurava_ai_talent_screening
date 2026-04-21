import Link from "next/link";
import { ArrowLeft, Sparkles, UploadCloud, Activity, Trophy } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const steps = [
  {
    icon: Sparkles,
    title: "Job Definition",
    description: "Define your ideal candidate requirements based on global tech standards.",
  },
  {
    icon: UploadCloud,
    title: "Unified Ingestion",
    description: "Drop CSVs or PDF resumes into our ingestion pipeline. Our AI parses and normalizes them instantly.",
  },
  {
    icon: Activity,
    title: "The Escalade Screening",
    description: "Watch the Escalade Loader in action as Gemini-powered intelligence performs comprehensive technical analysis on every profile.",
  },
  {
    icon: Trophy,
    title: "Instant Shortlist",
    description: "Access a transparently ranked Top 20 list, complete with AI-generated 'Strengths' and 'Gaps'.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#F5F5F7] bg-[radial-gradient(at_top_right,_#e2e8f0_0%,_transparent_50%),_radial-gradient(at_bottom_left,_#f1f5f9_0%,_transparent_50%)] text-slate-900">
      <Navbar />
      <section className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-24 pt-16">
        <Link
          href="/"
          className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/40 bg-white/30 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-2xl transition-all duration-300 hover:translate-y-[-1px] hover:bg-white/60 hover:text-[#1A8C4E] hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <header className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#1A8C4E]/80">How Umurava Works</p>
          <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">The smartest way to find top talent in Africa.</h1>
          <p className="text-lg text-slate-600">
            From defining your needs to viewing your shortlist, Umurava AI simplifies every step of the hiring journey.
          </p>
        </header>

        <div className="relative flex flex-col gap-10">
          <div className="absolute left-8 top-12 bottom-12 hidden w-px bg-gradient-to-b from-[#0B4F8A]/40 via-[#1A8C4E]/20 to-transparent md:block" />
          {steps.map(({ icon: Icon, title, description }, index) => (
            <article
              key={title}
              className="group relative z-10 flex flex-col gap-4 rounded-[3rem] border border-white/40 bg-white/40 p-8 text-slate-600 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-3xl saturate-150 transition-transform duration-500 hover:scale-[1.02] md:pl-20"
            >
              <div className="flex items-center gap-4">
                <div className="hidden md:flex md:flex-col md:items-center md:self-start">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A8C4E]/12 text-[#1A8C4E] shadow-inner">
                    <Icon size={22} strokeWidth={1.75} />
                  </div>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Step {index + 1}</div>
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 md:hidden">Step {index + 1}</div>
                  <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
                  <p className="mt-2 text-base text-slate-600">{description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
