import Link from "next/link";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[#1C1C2E]/8 bg-[#F5F5F7]/85 px-8 py-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0B4F8A]">
          <span className="text-sm font-bold text-white">U</span>
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight text-[#1C1C2E]">Umurava AI</div>
          <div className="text-[10px] leading-tight text-[#6B7280]">Talent Screening Platform</div>
        </div>
      </div>
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
    </nav>
  );
}
