import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { ApplicantModel } from "@/models/Applicant";
import { JobModel } from "@/models/Job";
import { ScreeningModel } from "@/models/Screening";
import { revalidateJobsListing } from "@/lib/jobs-cache";
import { executeScreening } from "@/src/services/geminiScreeningService";
import {
  ScreeningSystemLimitError,
  toApplicantsForScreening,
  toJobForScreening,
  type ApplicantForScreening,
  type JobForScreening,
} from "@/src/services/screeningService";

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.response || !auth.session) return auth.response;

  let screeningId: string | undefined;
  try {
    const body = (await request.json()) as { screeningId?: string };
    screeningId = body.screeningId?.trim();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request payload." }, { status: 400 });
  }

  if (!screeningId || !Types.ObjectId.isValid(screeningId)) {
    return NextResponse.json({ success: false, error: "Invalid screening id." }, { status: 400 });
  }

  await connectToDatabase();

  const screening = await ScreeningModel.findOne({ _id: screeningId, triggeredBy: auth.session.sub });
  if (!screening) {
    return NextResponse.json({ success: false, error: "Screening not found." }, { status: 404 });
  }

  if (screening.status === "completed" || screening.status === "failed") {
    return NextResponse.json({
      success: true,
      data: {
        id: String(screening._id),
        status: screening.status,
      },
    });
  }

  try {
    const jobDoc = await JobModel.findOne({ _id: screening.jobId, createdBy: auth.session.sub }).lean();
    if (!jobDoc) {
      screening.status = "failed";
      screening.error = "Job not found.";
      screening.errorMessage = "Job not found.";
      await screening.save();
      return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
    }

    const applicants = await ApplicantModel.find({ jobId: screening.jobId }).lean();
    if (applicants.length === 0) {
      screening.status = "failed";
      screening.error = "Add applicants before running a screening.";
      screening.errorMessage = "Add applicants before running a screening.";
      screening.results = [];
      screening.totalApplicants = 0;
      await screening.save();
      return NextResponse.json({ success: false, error: "Add applicants before running a screening." }, { status: 400 });
    }

    const jobPayload: JobForScreening = toJobForScreening(jobDoc);
    const applicantPayload: ApplicantForScreening[] = toApplicantsForScreening(applicants);

    screening.totalApplicants = applicantPayload.length;
    screening.shortlistSize = jobPayload.shortlistSize;
    await screening.save();

    try {
      const execution = await executeScreening(jobPayload, applicantPayload);

      screening.status = "completed";
      screening.totalApplicants = applicantPayload.length;
      screening.shortlistSize = jobPayload.shortlistSize;
      screening.results = execution.results;
      screening.processingTimeMs = execution.processingTimeMs;
      screening.aiModelVersion = execution.aiModelVersion;
      screening.promptVersion = execution.promptVersion;
      screening.usedFallback = execution.usedFallback;
      screening.error = execution.usedFallback ? execution.error : undefined;
      screening.errorMessage = execution.usedFallback ? execution.error : undefined;
      await screening.save();

      await JobModel.updateOne({ _id: screening.jobId }, { status: "screening" });
    } catch (error) {
      if (error instanceof ScreeningSystemLimitError) {
        screening.status = "failed";
        screening.error = error.message;
        screening.errorMessage = error.message;
        screening.results = [];
        await screening.save();
        return NextResponse.json({ success: false, error: error.message }, { status: 429 });
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
      screening.results = [];
      await screening.save();

      return NextResponse.json({ success: false, error: userMessage }, { status: 500 });
    }
  } catch (error) {
    console.error("Screening execution failed", error);
    if (screening.status === "processing") {
      screening.status = "failed";
      screening.error = "Screening execution failed unexpectedly.";
      screening.errorMessage = "Screening could not be completed. Please try again.";
      screening.results = [];
      await screening.save();
    }
    return NextResponse.json({ success: false, error: "Screening execution failed." }, { status: 500 });
  } finally {
    try {
      revalidateJobsListing();
    } catch (revalidateError) {
      console.warn("Failed to revalidate jobs listing", revalidateError);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      id: String(screening._id),
      status: screening.status,
    },
  });
}
