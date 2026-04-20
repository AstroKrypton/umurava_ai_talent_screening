import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { JobModel } from "@/models/Job";
import { ApplicantModel } from "@/models/Applicant";
import { ScreeningModel } from "@/models/Screening";
import { executeScreening } from "@/src/services/geminiScreeningService";
import { revalidateJobsListing } from "@/lib/jobs-cache";
import {
  ScreeningSystemLimitError,
  toApplicantsForScreening,
  toJobForScreening,
  type ApplicantForScreening,
  type JobForScreening,
} from "@/src/services/screeningService";

async function processScreening(screeningId: Types.ObjectId, jobId: string, userId: string) {
  try {
    await connectToDatabase();

    const screening = await ScreeningModel.findOne({ _id: screeningId, triggeredBy: userId });
    if (!screening) {
      return;
    }

    const jobDoc = await JobModel.findOne({ _id: jobId, createdBy: userId }).lean();
    if (!jobDoc) {
      screening.status = "failed";
      screening.error = "Job not found.";
      await screening.save();
      return;
    }

    const applicants = await ApplicantModel.find({ jobId }).lean();
    if (applicants.length === 0) {
      screening.status = "failed";
      screening.error = "Add applicants before running a screening.";
      screening.results = [];
      screening.totalApplicants = 0;
      await screening.save();
      return;
    }

    const jobPayload: JobForScreening = toJobForScreening(jobDoc);
    const applicantPayload: ApplicantForScreening[] = toApplicantsForScreening(applicants);

    screening.totalApplicants = applicantPayload.length;
    screening.shortlistSize = jobPayload.shortlistSize;
    await screening.save();

    try {
      const execution = await executeScreening(jobPayload, applicantPayload);

      screening.status = "completed";
      screening.results = execution.results;
      screening.processingTimeMs = execution.processingTimeMs;
      screening.aiModelVersion = execution.aiModelVersion;
      screening.promptVersion = execution.promptVersion;
      screening.usedFallback = execution.usedFallback;
      screening.error = execution.usedFallback ? execution.error : undefined;
      await screening.save();

      await JobModel.updateOne({ _id: jobId }, { status: "screening" });
    } catch (error) {
      if (error instanceof ScreeningSystemLimitError) {
        screening.status = "failed";
        screening.error = error.message;
        screening.results = [];
        await screening.save();
        return;
      }

      const message = error instanceof Error ? error.message : "Unknown screening error";
      screening.status = "failed";
      screening.error = message;
      screening.results = [];
      await screening.save();
    }
  } catch (error) {
    console.error("Failed to process screening", error);
  } finally {
    try {
      revalidateJobsListing();
    } catch (revalidateError) {
      console.warn("Failed to revalidate jobs listing", revalidateError);
    }
  }
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  let jobId: string | undefined;
  try {
    const body = (await request.json()) as { jobId?: string };
    jobId = body?.jobId?.trim();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request payload." }, { status: 400 });
  }

  if (!jobId || !Types.ObjectId.isValid(jobId)) {
    return NextResponse.json({ success: false, error: "Invalid job id." }, { status: 400 });
  }

  await connectToDatabase();

  const job = await JobModel.findOne({ _id: jobId, createdBy: auth.session.sub }).lean();
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
  }

  const existingScreening = await ScreeningModel.findOne({
    jobId,
    status: { $in: ["pending", "processing"] },
  }).lean();
  if (existingScreening) {
    return NextResponse.json(
      { success: false, error: "A screening is already in progress for this job." },
      { status: 409 },
    );
  }

  const applicantCount = await ApplicantModel.countDocuments({ jobId });
  if (applicantCount === 0) {
    return NextResponse.json({ success: false, error: "Add applicants before running a screening." }, { status: 400 });
  }

  const screening = await ScreeningModel.create({
    jobId,
    triggeredBy: auth.session.sub,
    status: "processing",
    totalApplicants: applicantCount,
    shortlistSize: job.shortlistSize ?? 10,
    results: [],
  });

  queueMicrotask(() => {
    void processScreening(screening._id, jobId!, auth.session.sub).catch((error) => {
      console.error("Screening background task failed", error);
    });
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        id: String(screening._id),
        status: screening.status,
        createdAt: screening.createdAt,
      },
    },
    { status: 202 },
  );
}
