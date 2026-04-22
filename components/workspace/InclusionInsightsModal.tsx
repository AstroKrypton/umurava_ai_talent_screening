"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            key="dialog"
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/50 overflow-y-auto"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          >
            <div className="flex min-h-full items-start justify-center p-4 pt-6 md:pt-10">
              <motion.div
                className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl my-4 md:my-8 p-6 md:p-10"
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
                  className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-800 pointer-events-auto"
                >
                  <X className="h-4 w-4" />
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
                    <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3 md:items-start md:gap-6 mt-8">
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
                      ].map((card, index) => {
                        const isEducationCard = card.title === "Education Neutrality";

                        return (
                          <motion.div
                            key={card.title}
                            className="bg-slate-50 rounded-2xl p-6 flex flex-col gap-3 text-slate-800"
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            custom={index}
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                              {card.title}
                            </p>
                            {index < 2 ? (
                              <p
                                className={
                                  isEducationCard
                                    ? "mt-4 text-lg md:text-xl font-bold text-slate-800 leading-snug"
                                    : "mt-4 text-3xl font-semibold text-slate-900"
                                }
                              >
                                {card.value}
                              </p>
                            ) : (
                              <p className="mt-4 text-sm leading-6 text-slate-700">
                                {card.value}
                              </p>
                            )}
                            <p className="mt-3 text-xs text-slate-500">{card.description}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[28px] border border-slate-200/60 bg-white/70 p-6 text-sm text-slate-600">
                      No insight data available yet for this shortlist.
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
