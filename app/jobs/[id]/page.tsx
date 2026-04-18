import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isValidObjectId } from "mongoose";
import JobDetail, { type JobDetailJob, type JobDetailMetrics } from "@/components/jobs/JobDetail";
import { ACCESS_TOKEN_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ApplicantModel } from "@/models/Applicant";
import { JobModel } from "@/models/Job";
import { ScreeningModel } from "@/models/Screening";

interface JobDetailPageProps {
  params: { id: string };
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = params;

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? null;
  const session = verifyAccessToken(token);

  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();

  if (!isValidObjectId(id)) {
    notFound();
  }

  const jobDoc = await JobModel.findOne({ _id: id, createdBy: session.sub }).lean();
  if (!jobDoc) {
    notFound();
  }

  const [applicantCount, screeningCount, latestScreening] = await Promise.all([
    ApplicantModel.countDocuments({ jobId: jobDoc._id }),
    ScreeningModel.countDocuments({ jobId: jobDoc._id }),
    ScreeningModel.findOne({ jobId: jobDoc._id }).sort({ createdAt: -1 }).lean(),
  ]);

  const job: JobDetailJob = {
    id: String(jobDoc._id),
    title: jobDoc.title,
    description: jobDoc.description,
    requiredSkills: jobDoc.requiredSkills ?? [],
    niceToHaveSkills: jobDoc.niceToHaveSkills ?? [],
    minExperienceYears: jobDoc.minExperienceYears ?? 0,
    educationLevel: jobDoc.educationLevel ?? "any",
    location: jobDoc.location,
    employmentType: jobDoc.employmentType,
    shortlistSize: jobDoc.shortlistSize,
    status: jobDoc.status,
    source: jobDoc.source,
    createdAt: jobDoc.createdAt?.toISOString?.() ?? jobDoc.createdAt?.toString?.() ?? null,
    updatedAt: jobDoc.updatedAt?.toISOString?.() ?? jobDoc.updatedAt?.toString?.() ?? null,
  };

  const metrics: JobDetailMetrics = {
    applicantCount,
    screeningCount,
    latestScreening: latestScreening
      ? {
          status: latestScreening.status,
          createdAt:
            latestScreening.createdAt?.toISOString?.() ?? latestScreening.createdAt?.toString?.() ?? null,
          processingTimeMs: latestScreening.processingTimeMs ?? null,
        }
      : null,
  };

  return (
    <JobDetail recruiterName={session.name} organisation={session.organisation} job={job} metrics={metrics} />
  );
}
