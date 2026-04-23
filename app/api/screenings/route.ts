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
    screening.error = execution.usedFallback ? execution.error : undefined;
    screening.errorMessage = execution.usedFallback ? execution.error : undefined;
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
          error: screening.error,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ScreeningSystemLimitError) {
      screening.status = "failed";
      screening.error = error.message;
      screening.errorMessage = error.message;
      await screening.save();

      revalidateJobsListing();
      return NextResponse.json(error.body, { status: error.status });
    }

    console.error("Screening failed:", error);
    const rawMessage = error instanceof Error ? error.message : "Unknown screening error";
    let userMessage = "Screening could not be completed. Please try again.";

    if (rawMessage?.includes("BSONError") || rawMessage?.includes("ObjectId") || rawMessage?.includes("Cast to")) {
      userMessage = "A data processing error occurred. Please try again.";
    } else if (rawMessage?.toLowerCase().includes("timeout") || rawMessage?.includes("ETIMEDOUT")) {
      userMessage = "The AI service took too long to respond. Please try again.";
    } else if (rawMessage?.toLowerCase().includes("quota") || rawMessage?.includes("429") || rawMessage?.toLowerCase().includes("rate limit")) {
      userMessage = "AI service is busy. Please wait a moment and try again.";
    } else if (rawMessage?.includes("JSON") || rawMessage?.toLowerCase().includes("parse")) {
      userMessage = "The AI returned an unexpected response. Please try again.";
    }

    screening.status = "failed";
    screening.error = userMessage;
    screening.errorMessage = userMessage;
    await screening.save();

    revalidateJobsListing();
    return NextResponse.json({ success: false, error: userMessage }, { status: 500 });
  }
}
