"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const mobileNavLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/recruiters", label: "For recruiters" },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1C1C2E]/8 bg-[#F5F5F7]/85 px-4 py-3 backdrop-blur-md md:px-8 md:py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0B4F8A]">
            <span className="text-sm font-bold text-white">U</span>
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight text-[#1C1C2E]">Umurava AI</div>
            <div className="text-[10px] leading-tight text-[#6B7280]">Talent Screening Platform</div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <Link
            href="/get-started"
            className="rounded-full bg-[#0B4F8A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#093d6e] md:hidden"
          >
            Get started
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/60 text-[#0B4F8A] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B4F8A] md:hidden"
            aria-label="Open navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen(true)}
          >
            <span className="flex flex-col items-center justify-center gap-1.5">
              <span className="h-0.5 w-5 rounded-full bg-current" />
              <span className="h-0.5 w-5 rounded-full bg-current" />
              <span className="h-0.5 w-5 rounded-full bg-current" />
            </span>
          </button>
          <div className="hidden items-center gap-6 md:flex">
            <Link href="/how-it-works" className="text-sm text-[#6B7280] transition-colors hover:text-[#1C1C2E]">
              How it works
            </Link>
            <Link href="/recruiters" className="text-sm text-[#6B7280] transition-colors hover:text-[#1C1C2E]">
              For recruiters
            </Link>
            <Link
              href="/get-started"
              className="rounded-full bg-[#0B4F8A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#093d6e]"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen ? (
          <>
            <motion.div
              key="mobile-nav-backdrop"
              className="fixed inset-0 z-40 bg-[#0B4F8A]/20 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
            />
            <motion.div
              key="mobile-nav-panel"
              id="mobile-navigation"
              role="dialog"
              aria-modal="true"
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col justify-between border-l border-white/60 bg-white/70 p-6 backdrop-blur-xl shadow-[0_16px_60px_rgba(11,79,138,0.25)]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 32 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0B4F8A] text-white">U</div>
                  <span className="text-sm font-semibold text-[#0B4F8A]">Umurava AI</span>
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/70 text-[#0B4F8A] transition hover:bg-white"
                  onClick={closeMenu}
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-10 flex flex-col gap-4 text-base font-medium text-[#1C1C2E]">
                {mobileNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-2xl border border-white/70 bg-white/70 px-5 py-3 text-sm uppercase tracking-[0.2em] text-[#0B4F8A] transition hover:border-[#0B4F8A]/50 hover:bg-white"
                    onClick={closeMenu}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <Link
                href="/get-started"
                className="mt-10 inline-flex items-center justify-center rounded-full bg-[#0B4F8A] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_18px_45px_rgba(11,79,138,0.28)] transition hover:bg-[#093d6e]"
                onClick={closeMenu}
              >
                Get started
              </Link>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}
