import Link from "next/link";
import HorizontalPipeline from "@/components/HorizontalPipeline";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F5F5F7]">
      <Navbar />
      <section className="flex flex-col items-center justify-center px-4 text-center mt-20 md:mt-32 lg:mt-36">
        <div className="inline-flex items-center gap-2 bg-[#E8F3FC] text-[#0B4F8A] text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-[#0B4F8A] rounded-full"></span>
          Built for Africa&apos;s talent market
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 max-w-4xl">
          Screen smarter.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0B4F8A] to-[#1A8C4E]">
            Hire the best.
          </span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl">
          Umurava AI evaluates hundreds of talent profiles in seconds — ranking candidates with transparent AI reasoning so your team can focus on people, not paperwork.
        </p>
        <div className="mt-12 animate-bounce opacity-50">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
        <div className="mt-10 w-full max-w-4xl border-t border-slate-200 pt-10">
          <div className="grid gap-10 text-center sm:grid-cols-3">
            <div className="flex flex-col items-center gap-3">
              <div className="text-6xl font-semibold text-slate-900 sm:text-7xl">
                <AnimatedCounter target={10} suffix="x" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                faster shortlisting
              </span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="text-6xl font-semibold text-slate-900 sm:text-7xl">
                <AnimatedCounter target={98} suffix="%" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                match accuracy
              </span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="text-6xl font-semibold text-slate-900 sm:text-7xl">
                <AnimatedCounter target={20} prefix="Top " />
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                candidates ranked
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* GSAP Horizontal Track Section */}
      <HorizontalPipeline />
      
      {/* Spacer section at bottom for scrolling past the track */}
      <Footer />
    </main>
  );
}
