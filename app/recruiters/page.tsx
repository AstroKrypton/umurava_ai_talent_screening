import Link from "next/link";
import { ArrowLeft, Gauge, Eye, Layers } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const advantages = [
  {
    icon: Gauge,
    title: "Save Days of Work",
    description: "Automate the first round of technical vetting and cut your screening time by 80%.",
  },
  {
    icon: Eye,
    title: "Transparent Reasoning",
    description: "Say goodbye to 'black-box' scores. Get clear evidence on why a candidate fits your role.",
  },
  {
    icon: Layers,
    title: "Consistent Quality",
    description: "Maintain a world-class hiring bar, whether you're reviewing 10 candidates or 100.",
  },
];

export default function RecruitersPage() {
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
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#1A8C4E]/80">For Recruiters</p>
          <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">Give your hiring team an unfair advantage.</h1>
          <p className="text-lg text-slate-600">
            Equip your recruiters with structured insights, faster decisions, and complete confidence in every shortlist.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {advantages.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="group flex flex-col gap-6 rounded-[3rem] border border-white/40 bg-white/40 p-8 text-slate-600 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-3xl saturate-150 transition-transform duration-500 hover:scale-[1.02]"
            >
              <div className="flex h-14 w-14 items-center justify-center self-start rounded-2xl bg-[#1A8C4E]/10 text-[#1A8C4E]">
                <Icon size={26} strokeWidth={1.75} />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
                <p className="text-base text-slate-600">{description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 rounded-[3rem] border border-white/40 bg-white/40 p-8 text-center text-slate-600 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-3xl saturate-150">
          <h2 className="text-2xl font-semibold text-slate-900">Ready to brief the Escalade?</h2>
          <p className="text-base text-slate-600">
            Deploy Umurava AI inside your hiring squad and give every stakeholder the same clear, data-rich shortlist.
          </p>
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 rounded-full bg-[#1A8C4E] px-6 py-2.5 text-sm font-semibold text-white transition-transform duration-500 hover:scale-[1.02] hover:bg-[#157340]"
          >
            Launch recruitment workspace
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
