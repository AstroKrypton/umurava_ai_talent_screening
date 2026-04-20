"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { X } from "lucide-react";
import { EscaladeLoader } from "@/src/components/ui/EscaladeLoader";
import type { InclusionInsightsReport } from "@/src/types/insights";

const cardEase: [number, number, number, number] = [0.21, 0.74, 0.32, 0.93];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: index * 0.12,
      duration: 0.45,
      ease: cardEase,
    },
  }),
};

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: { opacity: 0, y: 24, scale: 0.97, transition: { duration: 0.25, ease: "easeIn" } },
};

type InclusionInsightsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  report: InclusionInsightsReport | null;
  isLoading: boolean;
  error: string | null;
};

export function InclusionInsightsModal({
  isOpen,
  onClose,
  onRetry,
  report,
  isLoading,
  error,
}: InclusionInsightsModalProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            key="overlay"
            className="fixed inset-0 z-[140] bg-slate-900/40 backdrop-blur-xl"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <motion.div
            key="dialog"
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className="relative w-full max-w-3xl backdrop-blur-2xl bg-white/60 border border-white/40 rounded-[32px] p-8 shadow-[0_32px_80px_rgba(15,15,45,0.15)]"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close inclusion insights"
                onClick={onClose}
                className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="pr-10">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Inclusion & Diversity Insights</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                  How equitable is this shortlist?
                </h2>
                <p className="mt-2 max-w-xl text-sm text-slate-600">
                  We analyze the mix of backgrounds, toolkits, and pathways represented here to ensure the ranking remains anchored in technical merit instead of pedigree.
                </p>
              </div>

              <div className="mt-8 space-y-6">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3 rounded-[28px] bg-white/70 p-6 text-slate-600">
                    <EscaladeLoader />
                    <span className="text-sm font-medium">Synthesizing inclusion metrics—hang tight…</span>
                  </div>
                ) : error ? (
                  <div className="rounded-[28px] border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-600">
                    <p className="font-semibold">We couldn&apos;t load the insights.</p>
                    <p className="mt-2 text-rose-500/80">
                      {error}
                    </p>
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Try again
                    </button>
                  </div>
                ) : report ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      {
                        title: "Skill Diversity Index",
                        value: `${Math.round(report.skillDiversityIndex)}%`,
                        description: "Variety of tools and stacks represented across the shortlist.",
                      },
                      {
                        title: "Education Neutrality",
                        value: report.educationNeutrality,
                        description: "Balance between traditional academia and non-traditional pathways.",
                      },
                      {
                        title: "Inclusion Summary",
                        value: report.inclusionSummary,
                        description: "AI perspective on why this shortlist stays merit-first.",
                      },
                    ].map((card, index) => (
                      <motion.div
                        key={card.title}
                        className="rounded-[28px] border border-white/50 bg-white/80 p-6 text-slate-800 shadow-[0_20px_50px_rgba(15,15,45,0.08)]"
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        custom={index}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                          {card.title}
                        </p>
                        {index < 2 ? (
                          <p className="mt-4 text-3xl font-semibold text-slate-900">
                            {card.value}
                          </p>
                        ) : (
                          <p className="mt-4 text-sm leading-6 text-slate-700">
                            {card.value}
                          </p>
                        )}
                        <p className="mt-3 text-xs text-slate-500">{card.description}</p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-slate-200/60 bg-white/70 p-6 text-sm text-slate-600">
                    No insight data available yet for this shortlist.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
