import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { ApplicantModel } from "@/models/Applicant";
import { JobModel } from "@/models/Job";
import { ScreeningModel } from "@/models/Screening";
import { executeScreening } from "@/src/services/geminiScreeningService";
import { ScreeningSystemLimitError, toApplicantsForScreening, toJobForScreening } from "@/src/services/screeningService";
import { revalidateJobsListing } from "@/lib/jobs-cache";

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  const body = (await request.json()) as { jobId?: string };
  const jobId = body?.jobId?.trim();

  if (!jobId || !Types.ObjectId.isValid(jobId)) {
    return NextResponse.json({ success: false, error: "Invalid job id." }, { status: 400 });
  }

  await connectToDatabase();

  const job = await JobModel.findOne({ _id: jobId, createdBy: auth.session.sub }).lean();
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
  }

  const activeScreening = await ScreeningModel.findOne({
    jobId,
    status: { $in: ["pending", "processing"] },
  }).lean();

  if (activeScreening) {
    return NextResponse.json(
      { success: false, error: "A screening is already in progress for this job." },
      { status: 409 },
    );
  }

  const applicants = await ApplicantModel.find({ jobId }).lean();
  if (applicants.length === 0) {
    return NextResponse.json({ success: false, error: "Add applicants before running a screening." }, { status: 400 });
  }

  const jobPayload = toJobForScreening(job);
  const applicantPayload = toApplicantsForScreening(applicants);

  const screening = await ScreeningModel.create({
    jobId,
    triggeredBy: auth.session.sub,
    status: "processing",
    totalApplicants: applicantPayload.length,
    shortlistSize: jobPayload.shortlistSize,
    results: [],
  });

  try {
    const execution = await executeScreening(jobPayload, applicantPayload);

    screening.status = "completed";
    screening.results = execution.results;
    screening.aiModelVersion = execution.aiModelVersion;
    screening.promptVersion = execution.promptVersion;
    screening.processingTimeMs = execution.processingTimeMs;
    screening.errorMessage = execution.usedFallback ? execution.errorMessage : undefined;
    await screening.save();

    await JobModel.updateOne({ _id: jobId }, { status: "screening" });
    revalidateJobsListing();

    return NextResponse.json(
      {
        success: true,
        data: {
          id: String(screening._id),
          status: screening.status,
          totalApplicants: screening.totalApplicants,
          shortlistSize: screening.shortlistSize,
          results: screening.results,
          createdAt: screening.createdAt,
          processingTimeMs: screening.processingTimeMs,
          aiModelVersion: screening.aiModelVersion,
          promptVersion: screening.promptVersion,
          usedFallback: execution.usedFallback,
          errorMessage: screening.errorMessage,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ScreeningSystemLimitError) {
      screening.status = "failed";
      screening.errorMessage = error.message;
      await screening.save();

      revalidateJobsListing();
      return NextResponse.json(error.body, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unknown screening error";
    screening.status = "failed";
    screening.errorMessage = message;
    await screening.save();

    revalidateJobsListing();
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
