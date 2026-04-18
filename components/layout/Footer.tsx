import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[#F5F5F7]/90 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-center">
        <div className="text-base font-semibold text-[#1C1C2E]">Umurava AI</div>
        <p className="text-sm text-slate-400">Built in Rwanda · Screening talent across Africa</p>
        <Link
          href="/get-started"
          className="rounded-full bg-[#0B4F8A] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#093d6e]"
        >
          Start screening for free
        </Link>
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} Umurava · competence@umurava.africa</p>
      </div>
    </footer>
  );
}
