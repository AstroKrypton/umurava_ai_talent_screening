import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import JobsIndex from "@/components/jobs/JobsIndex";
import { ACCESS_TOKEN_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import { fetchJobsListing } from "@/lib/jobs-service";

export default async function JobsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? null;
  const session = verifyAccessToken(token);

  if (!session) {
    redirect("/login");
  }

  const listing = await fetchJobsListing({ createdBy: session.sub });

  return (
    <JobsIndex
      recruiterName={session.name}
      organisation={session.organisation}
      initialJobs={listing.jobs}
      initialCounts={listing.counts}
      initialPagination={listing.pagination}
    />
  );
}
