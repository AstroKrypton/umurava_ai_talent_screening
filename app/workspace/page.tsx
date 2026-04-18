import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import JobsWorkspace from "@/components/workspace/JobsWorkspace";
import { ACCESS_TOKEN_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { JobModel } from "@/models/Job";
import { logoutAction } from "./actions";

export default async function WorkspacePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? null;
  const session = verifyAccessToken(token);

  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();
  const jobs = await JobModel.find({ createdBy: session.sub }).sort({ createdAt: -1 }).lean();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#F8FBFF_0%,_#F5F5F7_52%,_#EEF6F1_100%)] px-6 py-10 text-[#1C1C2E] md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_30px_80px_rgba(28,28,46,0.08)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B4F8A] text-sm font-bold text-white">
              U
            </div>
            <div>
              <div className="text-sm font-semibold text-[#1C1C2E]">Umurava AI Workspace</div>
              <div className="text-sm text-slate-500">{session.organisation}</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-full bg-[#E8F3FC] px-4 py-2 text-sm font-medium text-[#0B4F8A]">
              Signed in as {session.name}
            </div>
            <form action={logoutAction}>
              <button className="rounded-full border border-[#1C1C2E]/10 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-[#1C1C2E]">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <JobsWorkspace
          initialJobs={jobs.map((job) => ({
            id: String(job._id),
            title: job.title,
            description: job.description,
            requiredSkills: job.requiredSkills,
            niceToHaveSkills: job.niceToHaveSkills,
            minExperienceYears: job.minExperienceYears,
            educationLevel: job.educationLevel,
            location: job.location,
            employmentType: job.employmentType,
            shortlistSize: job.shortlistSize,
            status: job.status,
            source: job.source,
            createdAt: job.createdAt?.toISOString(),
            updatedAt: job.updatedAt?.toISOString(),
          }))}
          recruiterName={session.name}
        />
      </div>
    </main>
  );
}
